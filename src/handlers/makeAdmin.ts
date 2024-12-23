import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { addUserToGroup } from "../services/cognitoService";
import { authenticate } from "../middleware/authMiddleware";
import { requireAdmin } from "../middleware/authMiddleware";
import { rateLimiter } from "../middleware/rateLimiter";

interface MakeAdminRequest {
  email: string;
}

const makeAdminHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { email } = JSON.parse(event.body || "{}") as MakeAdminRequest;

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Email é obrigatório",
        }),
      };
    }

    await addUserToGroup(email, "admin");

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Usuário promovido a administrador com sucesso",
      }),
    };
  } catch (error: any) {
    console.error("Erro ao promover usuário:", error);
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({
        message: error.message || "Erro ao promover usuário",
      }),
    };
  }
};

export const handler = authenticate(
  requireAdmin(rateLimiter(20)(makeAdminHandler))
);
