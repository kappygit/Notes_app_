# 🗄️ Note Konse Database Me Save Ho Rahe Hain? (Complete Proof & Details)

Aapka sawal bilkul natural hai! Aaiye bilkul simple bhasha me dekhte hain ki **aapke notes kahan ja kar store ho rahe hain**.

---

## 1. Database Ka Naam Aur Details

Aapka backend **Frappe Framework** use kar raha hai. Frappe backend ke peeche **MariaDB** (jo MySQL ka hi ek modern version hai) chal raha hai.

| Jankari | Value (Aapke System Me) |
| :--- | :--- |
| **Database Engine** | **MariaDB (MySQL)** |
| **Kahan Run Ho Raha Hai?** | WSL Ubuntu ke andar (Port `3306`) |
| **Database Ka Asli Naam** | `_0ce39c59cf7548f4` |
| **Database Username** | `_0ce39c59cf7548f4` |
| **Database Password** | `0Yr3HWto9w9SnCrU` (ye Frappe auto-generate karta hai) |
| **Frappe Site Name** | `frappe.local` |
| **Config File Kahan Hai?** | `/home/subhash/frappe-bench/sites/frappe.local/site_config.json` |

---

## 2. Table Ka Naam Kya Hai?

Frappe me jab bhi koi DocType banta hai (jaise humne banaya **`User Note`**), Frappe MariaDB ke andar uske aage **`tab`** jodkar table banata hai:

👉 **Table Ka Naam**: **`tabUser Note`**

### Is Table Ke Columns (Fields):
1. **`name`**: Har note ki unique ID (Jaise `i43m765a2u`, `687fpgdimj`).
2. **`title`**: Note ka title (Jo aapne type kiya, e.g. "day 1").
3. **`content`**: Note ka content.
4. **`note_user`**: Note kis user ka hai (e.g. `subh@gmail.com`).
5. **`creation`**: Note kab create hua (Date aur Time).
6. **`modified`**: Note kab edit/update hua.
7. **`owner`**: Creator user email.

---

## 3. 🔴 LIVE PROOF: Aapke Notes Database Me Maujood Hain!

Aapne abhi thodi der pehle browser se jo notes banaye hain, wo sabhi **MariaDB** ke table me safely save ho chuke hain:

| Note ID (`name`) | Note Title | Kis User Ka Hai (`note_user`) | Kab Bana (`creation`) |
| :--- | :--- | :--- | :--- |
| `i43m765a2u` | **day 1** | `subh@gmail.com` | 26 Oct 2026, 11:35 AM |
| `7eo7i74hg3` | **SsXA ca** | `k2@gmail.com` | 26 Oct 2026, 11:17 AM |
| `687fpgdimj` | **day 1** | `k752@gmail.com` | 26 Oct 2026, 11:15 AM |
| `o1glrnc77n` | **User A Private Note** | `testuser_auto_check@example.com` | 26 Oct 2026, 10:50 AM |

> 💡 **Notice karein:** `subh@gmail.com`, `k2@gmail.com`, aur `k752@gmail.com` teeno ke notes ek hi database table (`tabUser Note`) me hain, lekin jab `subh@gmail.com` login karta hai, toh use sirf apna `day 1` dikhta hai, baaki kisi ka note nahi dikhta!

---

## 4. Aap Khud Kaise Check Kar Sakte Hain? (Terminal Command)

Agar aap apne Windows PowerShell me MariaDB se direct notes dekhna chahte hain, toh ye 1-line command chalayein:

```powershell
wsl -- /home/subhash/frappe-bench/env/bin/python -c "import os; os.chdir('/home/subhash/frappe-bench/sites'); import sys; sys.path.insert(0, '/home/subhash/frappe-bench/apps/frappe'); import frappe; frappe.init(site='frappe.local', sites_path='.'); frappe.connect(); print(frappe.get_all('User Note', fields=['name', 'title', 'note_user', 'creation'])); frappe.destroy()"
```

Aapko screen par database me save saare notes print hokar dikh jayenge!

---

## 5. Other Tables Jo Database Me Hain

Aapke is MariaDB database me aur bhi tables hain jo authentication sambhalte hain:
- **`tabUser`**: Saare registered users (jaise `subh@gmail.com`, `k2@gmail.com`, `Administrator`).
- **`tabHasRole`**: Kaunsa user Admin hai aur kaunsa Normal User.
- **`tabSessions`**: Logged-in users ke active session tokens (`sid`).
