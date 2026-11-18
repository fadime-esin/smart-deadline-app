# Smart Deadline Management Application

A personal Android app that ranks assignments, exams, projects and personal tasks by a
dynamic Priority Score, plans each day's work and reminds you before deadlines become
critical. Everything runs on the phone: no server, no account, works offline.

| Part | Technology |
|---|---|
| Language | TypeScript |
| Mobile framework | React Native + Expo (SDK 58), Expo Router |
| Local database | SQLite (expo-sqlite) |
| Reminders | Local notifications (expo-notifications) |
| Languages | English and Turkish (follows the phone, or chosen in Settings) |
| Tests | Jest (jest-expo) |

## Main features

- **Priority Score** and four urgency levels (Overdue, Critical, At Risk, Normal),
  based on the remaining work and the working hours left before the deadline.
- **Today's plan**: what to work on today and for how long (Earliest Deadline First),
  with a warning when the workload does not fit.
- **Urgent tasks**: a task marked as urgent is planned before everything else.
- **Reminders** when a task becomes At Risk and when it becomes Critical.
- **Calendar**, work-time logging, optional safety margin, "School" theme
  (notebook in light mode, chalkboard in dark mode).

## Everyday use (development)

1. Make sure your phone and computer are on the **same Wi-Fi**.
2. Double-click **`start.bat`** in this folder. A QR code appears in the window.
3. Open **Expo Go** on your phone and scan the QR code. The app opens on the phone.
4. Code changes appear on the phone automatically within a few seconds.

To stop, close the window (or press `Ctrl + C` in it).
Use **`start-tunnel.bat`** instead when the phone is on a different network.

Reminders do not work inside Expo Go; they work in the installed app (APK).

## Building the installable app (APK)

Double-click **`build-apk.bat`**. The build runs on Expo's cloud build service and ends
with a download link and a QR code for the `.apk` file.

## Running the tests

Double-click **`run-tests.bat`**. It runs the automated tests of the priority
calculation, the planner, the calendar helpers, the formatting helpers and the
translations.

## Project structure

```
smart-deadline-app/
├── start.bat              # Starts the development server (double-click)
├── start-tunnel.bat       # Same, for phones on another network
├── build-apk.bat          # Builds the installable APK in the cloud
├── run-tests.bat          # Runs the automated tests (double-click)
├── setup-packages.bat     # Installs missing packages (used by the files above)
└── mobile/
    ├── app.json           # App name, icon, Android package, plugins
    ├── eas.json           # Build settings for the APK
    ├── package.json       # Libraries and commands
    ├── assets/            # App icon and splash image
    └── src/
        ├── app/           # Screens (Expo Router: one file = one screen)
        │   ├── _layout.tsx      # Loads fonts, opens the database, defines the screens
        │   ├── (tabs)/          # The four tabs: Today, Tasks, Calendar, Settings
        │   └── task/
        │       ├── new.tsx      # Add a task
        │       ├── urgent.tsx   # Add an urgent task (short form)
        │       └── [id].tsx     # Edit, log time, complete or delete a task
        ├── components/    # Reusable pieces: cards, badges, form, buttons, page background
        ├── db/            # SQLite schema, migrations and queries
        ├── hooks/         # Shared data for the tabs
        ├── i18n/          # English and Turkish texts, language selection (+ tests)
        ├── logic/         # Priority formula, planner, reminder timing, formatting (+ tests)
        ├── services/      # Task operations and notification scheduling
        └── theme/         # "School" theme: colours, fonts, icons
```

## Useful commands (in the `mobile` folder)

```powershell
npx expo start          # start the development server
npm test                # run the tests
npm run typecheck       # check the TypeScript code for errors
npx expo install <pkg>  # add a library (always use this instead of npm install <pkg>)
```
