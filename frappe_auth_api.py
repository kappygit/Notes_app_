import os
import secrets
import frappe
from frappe.utils import now_datetime, add_to_date, get_datetime
from frappe.utils.password import update_password

# ─────────────────────────────────────────────────────────────
# SECURITY & AUTHENTICATION HOOKS
# ─────────────────────────────────────────────────────────────

def validate_email_verification(login_manager=None):
    """
    Called by Frappe's LoginManager 'on_login' hook.
    Strictly blocks unverified users from logging in on the backend.
    """
    if not login_manager:
        return

    user = login_manager.user
    if not user or user in ("Administrator", "Guest"):
        return

    # Check if user has System Manager or Administrator role
    roles = frappe.get_roles(user)
    if "System Manager" in roles or "Administrator" in roles:
        return

    # Check if user's email has been verified
    is_verified = frappe.db.get_value("User", user, "custom_email_verified")
    if not is_verified:
        # Throw AuthenticationError so no session cookie is created
        frappe.throw(
            "Please verify your email before logging in.",
            frappe.AuthenticationError,
            title="Email Verification Required"
        )


# ─────────────────────────────────────────────────────────────
# HELPER: Send Verification Email
# ─────────────────────────────────────────────────────────────

def _get_frontend_url():
    """Gets the active frontend URL from request origin or falls back to localhost:5174"""
    if hasattr(frappe, "request") and frappe.request and frappe.request.headers.get("Origin"):
        return frappe.request.headers.get("Origin").rstrip("/")
    if hasattr(frappe, "request") and frappe.request and frappe.request.headers.get("Referer"):
        from urllib.parse import urlparse
        r = urlparse(frappe.request.headers.get("Referer"))
        return f"{r.scheme}://{r.netloc}"
    return "http://localhost:5174"


def _send_verification_email(email, full_name, token):
    """
    Sends the verification email using Frappe's sendmail functionality.
    Handles missing SMTP configuration gracefully without crashing.
    """
    frontend_url = _get_frontend_url()
    verification_link = f"{frontend_url}/verify-email?token={token}"

    subject = "Verify Your Email Address"
    message = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; margin-top: 0;">Welcome, {frappe.utils.escape_html(full_name)}! 👋</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            Thank you for registering. To complete your registration and activate your account, please verify your email address.
        </p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="{verification_link}" style="background: #4f46e5; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
                Verify Email Address
            </a>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
            Or copy and paste this link into your browser:<br/>
            <a href="{verification_link}" style="color: #4f46e5; word-break: break-all;">{verification_link}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
            This verification link will expire in 24 hours. If you did not create an account, please ignore this email.
        </p>
    </div>
    """

    email_sent = False
    warning = None

    try:
        frappe.sendmail(
            recipients=[email],
            subject=subject,
            message=message,
            now=True
        )
        email_sent = True
    except frappe.exceptions.OutgoingEmailError as e:
        warning = "Outgoing email (SMTP) is not configured in Frappe. Please configure Tools > Email Account."
        frappe.logger("email").warning(f"Verification email to {email} failed: {e}")
    except Exception as e:
        warning = f"Email sending failed: {str(e)}"
        frappe.logger("email").error(f"Verification email to {email} error: {e}")

    return {
        "email_sent": email_sent,
        "warning": warning,
        "verification_link": verification_link if (not email_sent and frappe.conf.get("developer_mode")) else None
    }


# ─────────────────────────────────────────────────────────────
# AUTHENTICATION APIs
# ─────────────────────────────────────────────────────────────

@frappe.whitelist(allow_guest=True)
def get_session():
    """
    Returns current session info.
    Safe for both Guests and Logged-in users (no permission error).
    """
    user = frappe.session.user
    if not user or user == "Guest":
        return {
            "authenticated": False,
            "user": None,
            "full_name": None,
            "roles": []
        }
    return {
        "authenticated": True,
        "user": user,
        "full_name": frappe.utils.get_fullname(user),
        "roles": frappe.get_roles(user)
    }


@frappe.whitelist()
def get_current_user_details():
    user = frappe.session.user
    if user == "Guest":
        frappe.throw("Not authenticated", frappe.PermissionError)
    return {
        "user": user,
        "full_name": frappe.utils.get_fullname(user),
        "roles": frappe.get_roles(user)
    }


@frappe.whitelist(allow_guest=True)
def register_user(full_name, email, password):
    """
    Registration with Email Verification.
    1. Validates inputs and duplicate email.
    2. Creates User in unverified state (custom_email_verified = 0).
    3. Generates a secure, time-limited single-use token.
    4. Sends verification email.
    """
    if not email or not password or not full_name:
        frappe.throw("Full name, email, and password are required.")

    email = email.strip().lower()
    full_name = full_name.strip()

    if len(password) < 6:
        frappe.throw("Password must be at least 6 characters long.")

    if frappe.db.exists("User", email):
        frappe.throw(f"An account with email '{email}' already exists.")

    # 1. Create user in unverified state
    user = frappe.get_doc({
        "doctype": "User",
        "email": email,
        "first_name": full_name,
        "enabled": 1,
        "send_welcome_email": 0,
        "user_type": "Website User",
        "custom_email_verified": 0  # Starts as unverified!
    })
    user.flags.ignore_permissions = True
    user.insert()

    # 2. Set password securely using Frappe standard hashing
    update_password(email, password)

    # 3. Generate secure token
    token = secrets.token_urlsafe(32)
    expires_at = add_to_date(now_datetime(), hours=24)

    token_doc = frappe.get_doc({
        "doctype": "Email Verification Token",
        "user": email,
        "token": token,
        "expires_at": expires_at,
        "is_used": 0,
        "last_sent_at": now_datetime()
    })
    token_doc.flags.ignore_permissions = True
    token_doc.insert()
    frappe.db.commit()

    # 4. Send verification email
    email_result = _send_verification_email(email, full_name, token)

    return {
        "status": "success",
        "message": "Registration successful! A verification link has been sent to your email address.",
        "user": email,
        "email_sent": email_result["email_sent"],
        "warning": email_result["warning"],
        "dev_link": email_result.get("verification_link")  # Only populated in dev mode if SMTP is missing
    }


@frappe.whitelist(allow_guest=True)
def verify_email(token):
    """
    Verifies a user's email using the provided token.
    1. Validates token exists and is unused.
    2. Checks token expiration.
    3. Marks custom_email_verified = 1 on User.
    4. Marks token as used (single-use).
    """
    if not token or not token.strip():
        frappe.throw("Verification token is required.", frappe.ValidationError)

    token = token.strip()

    # Look up token
    token_records = frappe.get_all(
        "Email Verification Token",
        filters={"token": token},
        fields=["name", "user", "expires_at", "is_used"],
        limit=1
    )

    if not token_records:
        frappe.throw("Invalid verification link. Please request a new verification email.", frappe.ValidationError)

    token_data = token_records[0]

    # Check if already used
    if token_data.is_used:
        frappe.throw("This verification link has already been used. Please log in or request a new verification link.", frappe.ValidationError)

    # Check expiration
    if get_datetime(token_data.expires_at) < now_datetime():
        frappe.throw("This verification link has expired. Please request a new verification email.", frappe.ValidationError)

    user_email = token_data.user

    # Mark user as verified
    frappe.db.set_value("User", user_email, "custom_email_verified", 1)

    # Invalidate token (single-use)
    frappe.db.set_value("Email Verification Token", token_data.name, {
        "is_used": 1,
        "verified_at": now_datetime()
    })
    frappe.db.commit()

    return {
        "status": "success",
        "message": "Email verified successfully. You can now log in.",
        "email": user_email
    }


@frappe.whitelist(allow_guest=True)
def resend_verification_email(email):
    """
    Resends verification email with rate limiting / cooldown protection.
    """
    if not email or not email.strip():
        frappe.throw("Email address is required.")

    email = email.strip().lower()

    if not frappe.db.exists("User", email):
        frappe.throw("No account found with this email address.", frappe.DoesNotExistError)

    # Check if already verified
    is_verified = frappe.db.get_value("User", email, "custom_email_verified")
    if is_verified:
        return {
            "status": "already_verified",
            "message": "Your email is already verified. You can log in directly."
        }

    # Cooldown check: 60 seconds rate limiting
    latest_tokens = frappe.get_all(
        "Email Verification Token",
        filters={"user": email},
        fields=["name", "last_sent_at", "creation"],
        order_by="creation desc",
        limit=1
    )

    if latest_tokens and latest_tokens[0].last_sent_at:
        seconds_passed = (now_datetime() - get_datetime(latest_tokens[0].last_sent_at)).total_seconds()
        if seconds_passed < 60:
            remaining = int(60 - seconds_passed)
            frappe.throw(f"Please wait {remaining} seconds before requesting another verification email.", frappe.ValidationError)

    # Invalidate previous unused tokens for this user
    unused_tokens = frappe.get_all(
        "Email Verification Token",
        filters={"user": email, "is_used": 0},
        pluck="name"
    )
    for t_name in unused_tokens:
        frappe.db.set_value("Email Verification Token", t_name, "is_used", 1)

    # Generate fresh token
    new_token = secrets.token_urlsafe(32)
    expires_at = add_to_date(now_datetime(), hours=24)

    token_doc = frappe.get_doc({
        "doctype": "Email Verification Token",
        "user": email,
        "token": new_token,
        "expires_at": expires_at,
        "is_used": 0,
        "last_sent_at": now_datetime()
    })
    token_doc.flags.ignore_permissions = True
    token_doc.insert()
    frappe.db.commit()

    # Fetch user full name
    first_name = frappe.db.get_value("User", email, "first_name") or email

    email_result = _send_verification_email(email, first_name, new_token)

    return {
        "status": "success",
        "message": "Verification email sent. Please check your inbox.",
        "email_sent": email_result["email_sent"],
        "warning": email_result["warning"],
        "dev_link": email_result.get("verification_link")
    }


# ─────────────────────────────────────────────────────────────
# SECURITY HELPERS (NOTES)
# ─────────────────────────────────────────────────────────────

def _ensure_authenticated():
    """Throws AuthenticationError if current session is Guest"""
    user = frappe.session.user
    if not user or user == "Guest":
        frappe.throw("You must be logged in to perform this action.", frappe.AuthenticationError)
    return user


def _is_admin(user=None):
    """Returns True if user has System Manager or Administrator role"""
    if not user:
        user = frappe.session.user
    if not user or user == "Guest":
        return False
    roles = frappe.get_roles(user)
    return "System Manager" in roles or "Administrator" in roles or user == "Administrator"


# ─────────────────────────────────────────────────────────────
# SECURE NOTES APIs
# ─────────────────────────────────────────────────────────────

@frappe.whitelist()
def create_note(title, content):
    """
    Creates a new note for the authenticated user.
    Server strictly sets note_user = frappe.session.user.
    Frontend CANNOT set or alter ownership.
    """
    current_user = _ensure_authenticated()

    if not title or not title.strip():
        frappe.throw("Note title is required.")
    if not content or not content.strip():
        frappe.throw("Note content is required.")

    title = title.strip()
    content = content.strip()

    note = frappe.get_doc({
        "doctype": "User Note",
        "title": title,
        "content": content,
        "note_user": current_user,
    })
    note.flags.ignore_permissions = True
    note.insert()
    frappe.db.commit()

    return {
        "name": note.name,
        "title": note.title,
        "content": note.content,
        "note_user": note.note_user,
        "creation": str(note.creation),
        "modified": str(note.modified),
    }


@frappe.whitelist()
def get_user_notes(search=None):
    """
    Fetches ONLY notes belonging to the current authenticated user.
    Enforces strict server-side ownership filtering.
    Supports search by title or content.
    """
    current_user = _ensure_authenticated()

    filters = [["User Note", "note_user", "=", current_user]]

    or_filters = []
    if search and search.strip():
        query = f"%{search.strip()}%"
        or_filters = [
            ["User Note", "title", "like", query],
            ["User Note", "content", "like", query]
        ]

    notes = frappe.get_all(
        "User Note",
        filters=filters,
        or_filters=or_filters if or_filters else None,
        fields=["name", "title", "content", "note_user", "creation", "modified"],
        order_by="modified desc"
    )

    return notes


@frappe.whitelist()
def get_note(note_id):
    """
    Gets a single note by ID.
    Strictly verifies that current user is the owner (or is Admin).
    Denies access to unauthorized users without leaking private note content.
    """
    current_user = _ensure_authenticated()

    if not note_id:
        frappe.throw("Note ID is required.")

    if not frappe.db.exists("User Note", note_id):
        frappe.throw("Note not found.", frappe.DoesNotExistError)

    note = frappe.get_doc("User Note", note_id)

    # STRICT PRIVACY CHECK
    if note.note_user != current_user and not _is_admin(current_user):
        frappe.throw("You do not have permission to access this note.", frappe.PermissionError)

    return {
        "name": note.name,
        "title": note.title,
        "content": note.content,
        "note_user": note.note_user,
        "creation": str(note.creation),
        "modified": str(note.modified),
    }


@frappe.whitelist()
def update_note(note_id, title, content):
    """
    Updates an owned note.
    Strictly verifies that current user is the owner (or is Admin).
    """
    current_user = _ensure_authenticated()

    if not note_id:
        frappe.throw("Note ID is required.")
    if not title or not title.strip():
        frappe.throw("Note title is required.")
    if not content or not content.strip():
        frappe.throw("Note content is required.")

    if not frappe.db.exists("User Note", note_id):
        frappe.throw("Note not found.", frappe.DoesNotExistError)

    note = frappe.get_doc("User Note", note_id)

    # STRICT PRIVACY CHECK
    if note.note_user != current_user and not _is_admin(current_user):
        frappe.throw("You do not have permission to update this note.", frappe.PermissionError)

    note.title = title.strip()
    note.content = content.strip()
    note.flags.ignore_permissions = True
    note.save()
    frappe.db.commit()

    return {
        "name": note.name,
        "title": note.title,
        "content": note.content,
        "note_user": note.note_user,
        "creation": str(note.creation),
        "modified": str(note.modified),
    }


@frappe.whitelist()
def delete_note(note_id):
    """
    Deletes an owned note.
    Strictly verifies that current user is the owner (or is Admin).
    """
    current_user = _ensure_authenticated()

    if not note_id:
        frappe.throw("Note ID is required.")

    if not frappe.db.exists("User Note", note_id):
        frappe.throw("Note not found.", frappe.DoesNotExistError)

    note = frappe.get_doc("User Note", note_id)

    # STRICT PRIVACY CHECK
    if note.note_user != current_user and not _is_admin(current_user):
        frappe.throw("You do not have permission to delete this note.", frappe.PermissionError)

    frappe.delete_doc("User Note", note_id, ignore_permissions=True)
    frappe.db.commit()

    return {
        "status": "success",
        "message": "Note deleted successfully."
    }


@frappe.whitelist()
def get_all_notes(search=None, user_filter=None):
    """
    ADMIN-ONLY API:
    Fetches notes from ALL users.
    Normal users get 403 PermissionError.
    Supports search by title/content and filter by user.
    """
    current_user = _ensure_authenticated()

    if not _is_admin(current_user):
        frappe.throw("Only authorized administrators can view all notes.", frappe.PermissionError)

    filters = []
    if user_filter and user_filter.strip():
        filters.append(["User Note", "note_user", "=", user_filter.strip()])

    or_filters = []
    if search and search.strip():
        query = f"%{search.strip()}%"
        or_filters = [
            ["User Note", "title", "like", query],
            ["User Note", "content", "like", query],
            ["User Note", "note_user", "like", query]
        ]

    notes = frappe.get_all(
        "User Note",
        filters=filters if filters else None,
        or_filters=or_filters if or_filters else None,
        fields=["name", "title", "content", "note_user", "creation", "modified"],
        order_by="modified desc"
    )

    return notes
