const { addUserToGroup } = require("../services/cognitoService");
const { protected } = require("../middleware/authMiddleware");

const makeAdminHandler = async (event) => {
  try {
    const { email } = JSON.parse(event.body);

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
  } catch (error) {
    console.error("Erro ao promover usuário:", error);
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({
        message: error.message || "Erro ao promover usuário",
      }),
    };
  }
};

module.exports = {
  handler: protected(makeAdminHandler),
};
