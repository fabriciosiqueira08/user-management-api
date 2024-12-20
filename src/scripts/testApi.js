require("dotenv").config();
const readline = require("readline");
const axios = require("axios");
const { execSync } = require("child_process");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (text) => new Promise((resolve) => rl.question(text, resolve));

let API_URL;
let authToken;

const getApiUrl = () => {
  const url = process.env.API_URL;
  if (!url) {
    console.error("API_URL não encontrada no arquivo .env");
    process.exit(1);
  }
  return url;
};

const menu = async () => {
  console.log("\n=== Menu de Teste da API ===");
  console.log("1. Registrar usuário");
  console.log("2. Confirmar registro");
  console.log("3. Login");
  console.log("4. Listar usuários");
  console.log("5. Buscar usuário por ID");
  console.log("6. Atualizar usuário");
  console.log("7. Deletar usuário");
  console.log("8. Renovar token");
  console.log("9. Logout");
  console.log("10. Inserir token manualmente");
  console.log("11. Tornar usuário admin");
  console.log("12. Sair");

  const option = await question("\nEscolha uma opção: ");
  console.log("");

  switch (option) {
    case "1":
      await registerUser();
      break;
    case "2":
      await confirmUser();
      break;
    case "3":
      await login();
      break;
    case "4":
      await listUsers();
      break;
    case "5":
      await getUser();
      break;
    case "6":
      await updateUser();
      break;
    case "7":
      await deleteUser();
      break;
    case "8":
      await refreshToken();
      break;
    case "9":
      await logout();
      break;
    case "10":
      await setToken();
      break;
    case "11":
      await makeUserAdmin();
      break;
    case "12":
      console.log("Até logo!");
      rl.close();
      return;
    default:
      console.log("Opção inválida!");
  }

  await menu();
};

const registerUser = async () => {
  const email = await question("Email: ");
  const password = await question("Senha: ");
  const name = await question("Nome: ");

  try {
    const response = await axios.post(`${API_URL}/users`, {
      email,
      password,
      name,
    });

    console.log("\nUsuário registrado com sucesso!");
    console.log(response.data);
  } catch (error) {
    handleError(error);
  }
};

const confirmUser = async () => {
  const email = await question("Email: ");
  const code = await question("Código de confirmação: ");

  try {
    const response = await axios.post(`${API_URL}/auth/confirm`, {
      email,
      code,
    });

    console.log("\nEmail confirmado com sucesso!");
    console.log(response.data);
  } catch (error) {
    handleError(error);
  }
};

const login = async () => {
  const email = await question("Email: ");
  const password = await question("Senha: ");

  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    });

    authToken = response.data.tokens.accessToken;
    console.log("\nLogin realizado com sucesso!");
    console.log("Token:", authToken);
  } catch (error) {
    handleError(error);
  }
};

const listUsers = async () => {
  try {
    const response = await axios.get(`${API_URL}/users`, getHeaders());
    console.log("\nLista de usuários:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    handleError(error);
  }
};

const getUser = async () => {
  const id = await question("ID do usuário: ");

  try {
    const response = await axios.get(`${API_URL}/users/${id}`, getHeaders());
    console.log("\nDados do usuário:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    handleError(error);
  }
};

const updateUser = async () => {
  const id = await question("ID do usuário: ");
  const name = await question("Novo nome: ");
  const email = await question("Novo email: ");

  try {
    const response = await axios.put(
      `${API_URL}/users/${id}`,
      {
        name,
        email,
      },
      getHeaders()
    );

    console.log("\nUsuário atualizado com sucesso!");
    console.log(response.data);
  } catch (error) {
    handleError(error);
  }
};

const deleteUser = async () => {
  const id = await question("ID do usuário: ");

  try {
    const response = await axios.delete(`${API_URL}/users/${id}`, getHeaders());
    console.log("\nUsuário deletado com sucesso!");
    console.log(response.data);
  } catch (error) {
    handleError(error);
  }
};

const refreshToken = async () => {
  const refreshToken = await question("Refresh Token: ");

  try {
    const response = await axios.post(`${API_URL}/auth/refresh-token`, {
      refreshToken,
    });

    authToken = response.data.tokens.idToken;
    console.log("\nToken renovado com sucesso!");
    console.log("Novo token:", authToken);
  } catch (error) {
    handleError(error);
  }
};

const logout = async () => {
  if (!authToken) {
    console.log("\nVocê não está logado!");
    return;
  }

  try {
    const response = await axios.post(
      `${API_URL}/auth/logout`,
      {},
      getHeaders()
    );

    console.log("\nLogout realizado com sucesso!");
    authToken = null;
  } catch (error) {
    handleError(error);
  }
};

const setToken = async () => {
  const token = await question("Token: ");
  authToken = token;
  console.log("\nToken definido com sucesso!");

  // Mostrar informações do token atual
  if (authToken) {
    const tokenParts = authToken.split(".");
    if (tokenParts.length === 3) {
      try {
        const payload = JSON.parse(
          Buffer.from(tokenParts[1], "base64").toString()
        );
        console.log("\nInformações do token:");
        console.log("- Email:", payload.email);
        console.log("- Nome:", payload.name);
        console.log(
          "- Expira em:",
          new Date(payload.exp * 1000).toLocaleString()
        );
      } catch (error) {
        console.log("Não foi possível decodificar o token");
      }
    }
  }
};

const getHeaders = () => ({
  headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
});

const handleError = (error) => {
  console.error("\nErro:", error.response?.data?.message || error.message);
};

const init = async () => {
  console.log("=== Teste da API de Usuários ===\n");
  API_URL = getApiUrl();
  console.log("URL da API:", API_URL);
  await menu();
};

const makeUserAdmin = async () => {
  const email = await question("Email do usuário: ");

  try {
    const response = await axios.post(
      `${API_URL}/users/make-admin`,
      { email },
      getHeaders()
    );

    console.log("\nUsuário promovido a administrador com sucesso!");
    console.log(response.data);
  } catch (error) {
    handleError(error);
  }
};

init();
