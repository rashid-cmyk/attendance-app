# Rashid & Co — Multi‑User (Firebase)
Urdu RTL web app with Firebase Authentication + Firestore.
- Admin email configured in app.js (`ADMIN_EMAIL`).
- Each employee signs up with email/password (creates `employees/{uid}` doc).
- Employees see & edit **only their own** attendance/expenses/profile.
- Admin sees all employees and can delete/link/update.
- Sunday auto-present runs when **admin logs in** (marks P for all employees for today).

## Setup (10 minutes)
1) Firebase Console → Create project.
2) Build → Authentication → Sign-in method → Enable **Email/Password**.
3) Build → Firestore Database → Create database (production mode).
4) Project settings → General → Web app → copy config and paste into `app.js (firebaseConfig)`.
5) In `app.js`, set `ADMIN_EMAIL` (e.g. `admin@rashid.com`).
6) Firestore rules → paste `firebaseRules.txt` (update admin email if changed), then **Publish**.
7) Open `index.html` locally.

## Create Accounts
- Admin: click **Sign Up** with admin email/password.
- Employees (3): each employee opens the page and **Sign Up** with their email/password.
- Admin → Admin Panel → type the employee's **email**, name, salary → **Link Email → Employee** to update their profile after they sign up.

## Notes
- Data model:
  - `employees/{uid}` → `{ name, salary, email }`
  - `employees/{uid}/expenses/{id}` → `{ date:'YYYY-MM-DD', amount, note }`
  - `employees/{uid}/attendance/{YYYY-MM-DD}` → `{ status: 'P'|'A'|'L' }`
- Sunday auto-present is triggered once when admin logs in on Sunday.
- You can customize colors in `style.css`.
