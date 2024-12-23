import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { confirmSignUp } from "../services/cognitoService";

interface ConfirmUserRequest {
  email: string;
  code: string;
}

const confirmUserHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { email, code } = JSON.parse(
      event.body || "{}"
    ) as ConfirmUserRequest;

    if (!email || !code) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Email e código de confirmação são obrigatórios",
        }),
      };
    }

    await confirmSignUp(email, code);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Email confirmado com sucesso",
      }),
    };
  } catch (error: any) {
    console.error("Erro ao confirmar usuário:", error);
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({
        message: error.message || "Erro ao confirmar usuário",
      }),
    };
  }
};

export const handler = confirmUserHandler;
