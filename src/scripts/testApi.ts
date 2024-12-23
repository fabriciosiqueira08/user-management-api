import axios, { AxiosError } from "axios";
import dotenv from "dotenv";
import * as readline from "readline";
import { getApiUrl } from "./getApiUrl";

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (text: string): Promise<string> =>
  new Promise((resolve) => rl.question(text, resolve));

interface User {
  email: string;
  name: string;
  password: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
}

class ApiTester {
  private baseUrl: string;
  private tokens: AuthTokens | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const response = await axios.post(`${this.baseUrl}/auth/login`, {
        email,
        password,
      });

      this.tokens = response.data.tokens;
      console.log("\nLogin realizado com sucesso!");
      if (this.tokens) {
        console.log("Token:", this.tokens.accessToken);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  async registerUser(): Promise<void> {
    try {
      const email = await question("Email: ");
      const password = await question("Senha: ");
      const name = await question("Nome: ");

      const response = await axios.post(`${this.baseUrl}/users`, {
        email,
        password,
        name,
      });

      console.log("\nUsuário registrado com sucesso!");
      console.log(response.data);
    } catch (error) {
      this.handleError(error);
    }
  }

  async confirmUser(): Promise<void> {
    try {
      const email = await question("Email: ");
      const code = await question("Código de confirmação: ");

      const response = await axios.post(`${this.baseUrl}/auth/confirm`, {
        email,
        code,
      });

      console.log("\nEmail confirmado com sucesso!");
      console.log(response.data);
    } catch (error) {
      this.handleError(error);
    }
  }

  async listUsers(): Promise<void> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/users`,
        this.getHeaders()
      );
      console.log("\nLista de usuários:");
      console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
      this.handleError(error);
    }
  }

  async getUser(): Promise<void> {
    try {
      const id = await question("ID do usuário: ");
      const response = await axios.get(
        `${this.baseUrl}/users/${id}`,
        this.getHeaders()
      );
      console.log("\nDados do usuário:");
      console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateUser(): Promise<void> {
    try {
      const id = await question("ID do usuário: ");
      const name = await question("Novo nome: ");
      const email = await question("Novo email: ");

      const response = await axios.put(
        `${this.baseUrl}/users/${id}`,
        { name, email },
        this.getHeaders()
      );

      console.log("\nUsuário atualizado com sucesso!");
      console.log(response.data);
    } catch (error) {
      this.handleError(error);
    }
  }

  async deleteUser(): Promise<void> {
    try {
      const id = await question("ID do usuário: ");
      const response = await axios.delete(
        `${this.baseUrl}/users/${id}`,
        this.getHeaders()
      );
      console.log("\nUsuário deletado com sucesso!");
      console.log(response.data);
    } catch (error) {
      this.handleError(error);
    }
  }

  async refreshToken(): Promise<void> {
    try {
      const refreshToken = await question("Refresh Token: ");
      const response = await axios.post(`${this.baseUrl}/auth/refresh-token`, {
        refreshToken,
      });

      this.tokens = response.data.tokens;
      console.log("\nToken renovado com sucesso!");
      if (this.tokens) {
        console.log("Novo token:", this.tokens.accessToken);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    if (!this.tokens?.accessToken) {
      console.log("\nVocê não está logado!");
      return;
    }

    try {
      await axios.post(`${this.baseUrl}/auth/logout`, {}, this.getHeaders());

      console.log("\nLogout realizado com sucesso!");
      this.tokens = null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async setToken(): Promise<void> {
    const token = await question("Token: ");
    this.tokens = {
      accessToken: token,
      refreshToken: "",
      idToken: "",
    };
    console.log("\nToken definido com sucesso!");

    // Mostrar informações do token atual
    if (token) {
      const tokenParts = token.split(".");
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
  }

  async makeUserAdmin(): Promise<void> {
    try {
      const email = await question("Email do usuário: ");
      const response = await axios.post(
        `${this.baseUrl}/users/make-admin`,
        { email },
        this.getHeaders()
      );

      console.log("\nUsuário promovido a administrador com sucesso!");
      console.log(response.data);
    } catch (error) {
      this.handleError(error);
    }
  }

  private getHeaders() {
    return {
      headers: this.tokens?.accessToken
        ? { Authorization: `Bearer ${this.tokens.accessToken}` }
        : {},
    };
  }

  private handleError(error: unknown): void {
    if (error instanceof AxiosError && error.response) {
      console.error("\nErro:", error.response.data?.message || error.message);
    } else {
      console.error("\nErro:", String(error));
    }
  }

  async showMenu(): Promise<void> {
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
        await this.registerUser();
        break;
      case "2":
        await this.confirmUser();
        break;
      case "3":
        const email = await question("Email: ");
        const password = await question("Senha: ");
        await this.login(email, password);
        break;
      case "4":
        await this.listUsers();
        break;
      case "5":
        await this.getUser();
        break;
      case "6":
        await this.updateUser();
        break;
      case "7":
        await this.deleteUser();
        break;
      case "8":
        await this.refreshToken();
        break;
      case "9":
        await this.logout();
        break;
      case "10":
        await this.setToken();
        break;
      case "11":
        await this.makeUserAdmin();
        break;
      case "12":
        console.log("Até logo!");
        rl.close();
        return;
      default:
        console.log("Opção inválida!");
    }

    await this.showMenu();
  }
}

const init = async (): Promise<void> => {
  try {
    console.log("=== Teste da API de Usuários ===\n");
    const apiUrl = await getApiUrl();
    console.log("URL da API:", apiUrl);

    const tester = new ApiTester(apiUrl);
    await tester.showMenu();
  } catch (error) {
    console.error("Erro ao inicializar:", error);
    process.exit(1);
  }
};

if (require.main === module) {
  init();
}

export { ApiTester };
