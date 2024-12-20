const { confirmSignUp } = require("../services/cognitoService");

const confirmUserHandler = async (event) => {
  try {
    const { email, code } = JSON.parse(event.body);

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
  } catch (error) {
    console.error("Erro ao confirmar usuário:", error);
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({
        message: error.message || "Erro ao confirmar usuário",
      }),
    };
  }
};

module.exports = {
  handler: confirmUserHandler,
};
