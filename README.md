# Praja Voice

Smart village grievance management prototype.

## Run locally

```powershell
npm.cmd install
npm.cmd run setup:auth
npm.cmd start
```

`npm.cmd run setup:auth` interactively creates the first `ADMIN` identity and,
if needed, an ignored `.env` file with a randomly generated signing secret.
Passwords are entered without echo and stored as salted scrypt hashes in
`data/officers.json`; they are never stored in plaintext. The identity file is
the application database for officer accounts. Keep `.env` and `data/` private
and never commit or share them. `.env.example` lists the required setting.

An ADMIN can create and activate/deactivate government accounts in the
application's Admin Account Management panel, or register accounts through the
protected API. Supported roles are `GRAMA_SACHIVALAYAM`,
`DISTRICT_AUTHORITY`, `OFFICER`, and `ADMIN`. There is no public officer
registration. For example, from PowerShell, first log in using the ADMIN
credentials created by setup:

```powershell
$admin = Invoke-RestMethod -Method Post http://localhost:3000/api/auth/login `
  -ContentType 'application/json' `
  -Body (@{ username = 'your-admin'; password = 'your-admin-password' } | ConvertTo-Json)
```

Then create a portal account with a unique username, strong password, and the
assigned role:

```powershell
Invoke-RestMethod -Method Post http://localhost:3000/api/auth/register `
  -ContentType 'application/json' `
  -Headers @{ Authorization = "Bearer $($admin.accessToken)" } `
  -Body (@{
    username = 'grama-office'
    password = 'use-a-unique-strong-password'
    role = 'GRAMA_SACHIVALAYAM'
    department = 'Ramapuram Grama Sachivalayam'
  } | ConvertTo-Json)
```

Open `http://localhost:3000`. The Grama Sachivalayam and District Authority
portals each require their matching role and use an HttpOnly, SameSite session
cookie. Their dashboard URLs (`/grama-sachivalayam` and
`/district-authority`) and dashboard APIs enforce role authorization on the
server. Sessions expire after one hour and logout revokes the active session.
Production deployments must use HTTPS. Existing `OFFICER` accounts remain
department-scoped, and Admin/Citizen workflows remain available. Only `ADMIN`
accounts can manage accounts, issue Collectorate escalations, or reset sample
complaints; District Authority accounts can review forwarded complaints and
return them to Grama Sachivalayam with a fresh 24-hour resolution deadline.
Grama Sachivalayam can forward assigned complaints to District Authority with
review remarks, and District-returned complaints require resolution remarks and
a newly uploaded resolution photo. Three District Authority review
demonstration records are seeded idempotently, marked internally as
`SAMPLE / HACKATHON TEST DATA`, and contain no evidence photos. Complaint
creation, forwarding, and District escalation timestamps are recorded
separately and displayed in IST. Missing auth initialization fails closed.

## Photographic evidence

The server accepts JPEG, PNG, and WebP files up to 5 MB and checks the declared
MIME type against the file signature. It stores files under `data/evidence/`
and complaint/evidence metadata in `data/complaints.json`. The `data/` directory
is ignored by Git and should be backed up and protected in a real deployment.

Citizens can upload one immutable original complaint photo while a complaint is
submitted. Authorized officers can submit inspection notes with inspection
photos and upload resolution evidence. Complaints cannot be marked resolved
until stored resolution evidence exists. Citizens can still dispute a
resolution, reopening the complaint without deleting its evidence.

File-format checks and provenance establish where an image came from in the
application, not whether its contents genuinely depict the claimed repair;
citizens should inspect and dispute incorrect evidence.

## Test

```powershell
npm.cmd test
```

The workflow test uses an isolated temporary data directory and removes it
when complete. It exercises registration, login, signed-token validation,
the Citizen-to-Grama-to-District-to-Grama resolution workflow, idempotent demo
seeding, department-scoped urgent escalations, inspection and resolution
evidence, role restrictions, unauthorized requests, disputes, and persistence.
