const { execSync } = require("child_process");

try {
  // Executa o comando serverless info
  const output = execSync("serverless info", { encoding: "utf8" });

  // Procura pela linha que contém a URL da API
  const lines = output.split("\n");
  const apiUrlLine = lines.find(
    (line) => line.includes("https://") && line.includes("execute-api")
  );

  if (apiUrlLine) {
    const url = apiUrlLine.split(":").slice(-1)[0].trim();
    console.log("\nURL da sua API:");
    console.log(url);
    console.log("\nUse esta URL no script de teste da API");
  } else {
    console.log(
      'URL da API não encontrada. Certifique-se de que a API foi deployada com "npm run deploy"'
    );
  }
} catch (error) {
  console.error("Erro ao buscar informações da API:", error.message);
}
