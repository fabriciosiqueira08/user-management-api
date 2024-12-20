const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const { promisify } = require("util");

const region = process.env.AWS_REGION || "us-east-1";
const userPoolId = process.env.USER_POOL_ID;

const client = jwksClient({
  jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutos
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

// Promisify the getSigningKey function
const getSigningKey = promisify(client.getSigningKey.bind(client));

const verifyToken = async (token) => {
  try {
    // Get the kid (Key ID) from the token header
    const decodedToken = jwt.decode(token, { complete: true });
    if (!decodedToken) {
      throw new Error("Token inválido");
    }

    // Get the signing key
    const key = await getSigningKey(decodedToken.header.kid);
    const signingKey = key.publicKey || key.rsaPublicKey;

    // Verify the token
    const verified = jwt.verify(token, signingKey, {
      algorithms: ["RS256"],
      issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
    });

    return verified;
  } catch (error) {
    console.error("Erro na verificação do token:", error);
    throw error;
  }
};

// Middleware para Lambda handlers
const authMiddleware = async (event) => {
  try {
    const authHeader =
      event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Token não fornecido" }),
      };
    }

    const token = authHeader.replace("Bearer ", "");
    const decodedToken = await verifyToken(token);

    // Adiciona as informações do usuário ao evento
    event.user = {
      sub: decodedToken.sub,
      email: decodedToken["email"],
      groups: decodedToken["cognito:groups"] || [],
    };

    return null; // Continua para o handler
  } catch (error) {
    console.error("Erro de autenticação:", error);
    return {
      statusCode: 401,
      body: JSON.stringify({ message: "Token inválido ou expirado" }),
    };
  }
};

// Função de alto nível para proteger handlers
const protected = (handler) => async (event, context) => {
  const authResult = await authMiddleware(event);
  if (authResult) {
    return authResult; // Retorna erro de autenticação se houver
  }
  return handler(event, context); // Continua para o handler se autenticado
};

module.exports = {
  verifyToken,
  authMiddleware,
  protected,
};
