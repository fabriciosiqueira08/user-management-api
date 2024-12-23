import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import * as crypto from "crypto";

const sesClient = new SESClient({ region: "us-east-1" });

export const generateTempPassword = (): string => {
  return crypto.randomBytes(8).toString("hex");
};

export const generateConfirmationLink = (userId: string): string => {
  const token = crypto.randomBytes(32).toString("hex");
  // TODO: Armazenar token temporariamente (DynamoDB ou Redis)
  return `${process.env.FRONTEND_URL}/complete-registration?userId=${userId}&token=${token}`;
};

export const sendConfirmationEmail = async (
  email: string,
  confirmationLink: string
): Promise<void> => {
  const params = {
    Source: process.env.SENDER_EMAIL,
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: "Complete seu registro" },
      Body: {
        Html: {
          Data: `
            <h1>Complete seu registro</h1>
            <p>Clique no link abaixo para completar seu registro:</p>
            <a href="${confirmationLink}">Completar registro</a>
          `,
        },
      },
    },
  };

  await sesClient.send(new SendEmailCommand(params));
};
