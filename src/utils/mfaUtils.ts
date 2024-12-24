import { authenticator } from "otplib";

export const generateMFACode = (): string => {
  // Configurar o tamanho do código e o tempo de expiração
  authenticator.options = {
    digits: 6,
    step: 300, // 5 minutos
  };

  // Gerar uma chave secreta aleatória
  const secret = authenticator.generateSecret();

  // Gerar o código baseado na chave secreta
  return authenticator.generate(secret);
};
