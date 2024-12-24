import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomBytes } from "crypto";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const MFA_CODES_TABLE = process.env.MFA_CODES_TABLE;
const MFA_CODE_EXPIRATION = 5 * 60; // 5 minutos em segundos

const generateSessionToken = (): string => {
  return randomBytes(32).toString("hex");
};

interface MFASession {
  sessionToken: string;
  email: string;
}

export const storeMFACode = async (
  email: string,
  code: string
): Promise<string> => {
  try {
    const now = Math.floor(Date.now() / 1000);
    const ttl = now + MFA_CODE_EXPIRATION;
    const sessionToken = generateSessionToken();

    const params = {
      TableName: MFA_CODES_TABLE,
      Item: {
        sessionToken,
        email,
        code,
        ttl,
        createdAt: new Date().toISOString(),
      },
    };

    const command = new PutCommand(params);
    await docClient.send(command);
    console.log(`Código MFA armazenado para sessão ${sessionToken}`);
    return sessionToken;
  } catch (error) {
    console.error("Erro ao armazenar código MFA:", error);
    throw error;
  }
};

export const verifyMFACode = async (
  sessionToken: string,
  code: string
): Promise<string | null> => {
  try {
    const params = {
      TableName: MFA_CODES_TABLE,
      Key: { sessionToken },
    };

    const command = new GetCommand(params);
    const result = await docClient.send(command);

    if (!result.Item) {
      console.log("Nenhum código MFA encontrado para sessão", sessionToken);
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (now > result.Item.ttl) {
      console.log("Código MFA expirado para sessão", sessionToken);
      return null;
    }

    const isValid = result.Item.code === code;
    if (isValid) {
      console.log("Código MFA válido para sessão", sessionToken);
      return result.Item.email;
    } else {
      console.log("Código MFA inválido para sessão", sessionToken);
      return null;
    }
  } catch (error) {
    console.error("Erro ao verificar código MFA:", error);
    throw error;
  }
};
