# Firebase Service Account Key Instructions

To generate and encode a service account key for your Firebase project, follow these steps:

## 1. Generate a Service Account Key

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`book-critics-club`)
3. Click on the gear icon (⚙️) next to "Project Overview" to open Project settings
4. Go to the "Service accounts" tab
5. Click "Generate new private key" button
6. Confirm by clicking "Generate key"
7. A JSON file will be downloaded to your computer
8. Keep this file secure and DO NOT commit it to your repository

## 2. Encode the Service Account Key to Base64

### On macOS/Linux:

```bash
cat path/to/downloaded-service-account-file.json | base64 > serviceAccountKey.txt
```

Then open serviceAccountKey.txt to copy the base64 encoded string.

### On Windows:

```bash
certutil -encode path\to\downloaded-service-account-file.json temp.b64 && findstr /v /c:- temp.b64 > serviceAccountKey.txt && del temp.b64
```

Then open serviceAccountKey.txt to copy the base64 encoded string.

## 3. Add to Environment Variables

Add the base64 encoded string to your `.env.local` file as the value for `FIREBASE_SERVICE_ACCOUNT_KEY`:

```
FIREBASE_SERVICE_ACCOUNT_KEY=your-base64-encoded-string-here
```

## 4. Test Your Configuration

Run the Firebase initialization script to test that your service account is working:

```bash
pnpm firebase:init-collections
```

If successful, you should see your collections created in the Firebase console. 