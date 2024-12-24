import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
});

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
}

export const sendEmail = async ({
  to,
  subject,
  body,
}: EmailOptions): Promise<void> => {
  try {
    const params = {
      Source: process.env.SES_FROM_EMAIL,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: body,
            Charset: "UTF-8",
          },
        },
      },
    };

    const command = new SendEmailCommand(params);
    await sesClient.send(command);
    console.log(`Email enviado com sucesso para ${to}`);
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    throw error;
  }
};

export const sendTempPasswordEmail = async (
  email: string,
  tempPassword: string
): Promise<void> => {
  const subject = "Welcome - Your Temporary Password";
  const body = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2 style="color: #4CAF50;">Welcome to Our System!</h2>
      <p>Dear User,</p>
      <p>We're excited to have you on board! To get started, please use the temporary password below to log in to your account:</p>
      <p style="font-size: 18px; font-weight: bold; color: #ff6600;">${tempPassword}</p>
      <p>Once you log in, we recommend updating your password to something secure and easy for you to remember.</p>
      <p style="color: #ff0000;">Important: This password will expire in 24 hours for your security.</p>
      <p>If you have any questions or need assistance, feel free to contact our support team.</p>
      <p>Welcome aboard, and thank you for joining us!</p>
      <p>Best regards,</p>
      <p><strong>Inside Code Team</strong></p>
    </div>
  `;

  await sendEmail({ to: email, subject, body });
};

export const sendMFACodeEmail = async (
  email: string,
  code: string
): Promise<void> => {
  const subject = "Your MFA Verification Code";
  const body = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #4CAF50;">Your Verification Code</h2>
      <p>To complete your login, please use the following verification code:</p>
      <h3 style="font-size: 28px; color: #4a90e2; text-align: center;">${code}</h3>
      <p style="color: #ff0000;">This code will expire in 5 minutes for your security.</p>
      <p>If you did not request this code, you can safely ignore this email.</p>
      <p>If you have any questions or concerns, feel free to contact our support team.</p>
      <p>Thank you for using our service!</p>
      <p>Best regards,</p>
      <p><strong>Your Company Team</strong></p>
    </div>
  `;

  await sendEmail({ to: email, subject, body });
};
