console.log(`
Comandos disponíveis para gerenciamento do Cognito:

1. Criar User Pool e App Client:
   npm run cognito:create-pool

2. Registrar usuário (com credenciais padrão):
   npm run cognito:signup

3. Registrar usuário específico:
   npm run cognito:signup-user <email> <senha>
   Exemplo: npm run cognito:signup-user usuario@exemplo.com Senha123!

Observações:
- Certifique-se de ter as credenciais AWS configuradas
- O User Pool deve ser criado antes de registrar usuários
- As senhas devem seguir a política definida:
  * Mínimo 8 caracteres
  * Pelo menos uma letra maiúscula
  * Pelo menos uma letra minúscula
  * Pelo menos um número
  * Pelo menos um símbolo
`);
