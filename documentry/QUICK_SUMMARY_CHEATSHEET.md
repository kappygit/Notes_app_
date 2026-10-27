# ⚡ 2-Minute Quick Summary & Cheat Sheet

Agar aapko 2 minute me kisi ko poora project samjhana ho, toh bas yeh 5 baatein yaad rakhein:

---

### 1. Database Kaun Sa Hai?
- **MariaDB (MySQL)** jo WSL Ubuntu ke andar Port 3306 par chal raha hai.
- Database ka actual naam: `_0ce39c59cf7548f4`.
- Notes jis table me save hote hain: **`tabUser Note`**.
- Users jis table me save hote hain: **`tabUser`**.

### 2. Frontend Aur Backend Aapas Me Kaise Connected Hain?
- **Frontend**: React + Vite (`http://localhost:5174`).
- **Backend**: Frappe Framework (Python) (`http://192.168.29.171:8000`).
- **Connection**: `vite.config.js` me Reverse Proxy laga hai jo sabhi `/api` requests ko Frappe tak forward karta hai taaki **CORS error na aaye** aur cookies sahi se transfer hon.

### 3. Note Kaise Save Ho Raha Hai?
1. User form bharta hai aur click karta hai.
2. React `POST /api/method/auth_app.api.create_note` bhejta hai.
3. Frappe backend function `create_note()` chalta hai.
4. Server session se user ka email nikalta hai (`frappe.session.user`).
5. Frappe ORM `INSERT` query chalakar **MariaDB** ke `tabUser Note` table me row daal deta hai.

### 4. Privacy Ka Sabse Bada Rule (User A vs User B)
- **User A** sirf apne notes dekh, edit aur delete kar sakta hai.
- **User B** User A ke notes na toh list me dekh sakta hai, na URL me ID badal kar padh sakta hai.
- Agar User B direct API se bhi User A ka note maangne ki koshish karega, Frappe backend **403 PermissionError (Forbidden)** fek kar request reject kar dega.
- **Server-side ownership verification**: Backend kisi bhi user par andha bharosa nahi karta.

### 5. Admin vs Normal User
- Normal registered users: `user_type: "Website User"` (roles: `All`, `Guest`). Inhe admin panel ka access kabhi nahi milta.
- Admin user (`Administrator`): Roles: `System Manager`, `Administrator`. Ye sabhi users ke notes **`/admin/notes`** par dekh sakte hain.
