import { google } from "googleapis";

let sheetsInstance: any = null;

export async function getSheets() {
  if (!sheetsInstance) {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(
        Buffer.from(
          process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64!,
          "base64"
        ).toString("utf-8")
      ),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });
    sheetsInstance = google.sheets({ version: "v4", auth });
  }
  return sheetsInstance;
}