import {
  DefineAuthChallengeTriggerEvent,
  CreateAuthChallengeTriggerEvent,
  VerifyAuthChallengeResponseTriggerEvent,
} from "aws-lambda";
import { generateMFACode } from "../utils/mfaUtils";
import { sendMFACodeEmail } from "../services/emailService";
import { storeMFACode, verifyMFACode } from "../services/mfaService";

export const handler = async (event: any) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  switch (event.triggerSource) {
    case "DefineAuthChallenge_Authentication":
      return handleDefineAuth(event);
    case "CreateAuthChallenge_Authentication":
      return handleCreateAuth(event);
    case "VerifyAuthChallengeResponse_Authentication":
      return handleVerifyAuth(event);
    default:
      throw new Error(`Unsupported triggerSource: ${event.triggerSource}`);
  }
};

async function handleDefineAuth(event: DefineAuthChallengeTriggerEvent) {
  const { session } = event.request;
  console.log(
    "DefineAuthChallenge - Session:",
    JSON.stringify(session, null, 2)
  );

  // Se não houver sessão anterior, iniciar o desafio MFA
  if (session.length === 0) {
    console.log("Iniciando primeiro desafio MFA");
    event.response.challengeName = "CUSTOM_CHALLENGE";
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
  } else {
    // Verificar o resultado do desafio anterior
    const lastChallenge = session[session.length - 1];
    console.log("Último desafio:", JSON.stringify(lastChallenge, null, 2));

    if (lastChallenge.challengeResult === false) {
      console.log("Último desafio falhou, encerrando autenticação");
      event.response.issueTokens = false;
      event.response.failAuthentication = true;
    } else if (
      lastChallenge.challengeMetadata === "MFA_CHALLENGE" &&
      lastChallenge.challengeResult === true
    ) {
      console.log("MFA validado com sucesso, emitindo tokens");
      event.response.issueTokens = true;
      event.response.failAuthentication = false;
    } else {
      console.log("Continuando com desafio MFA");
      event.response.challengeName = "CUSTOM_CHALLENGE";
      event.response.issueTokens = false;
      event.response.failAuthentication = false;
    }
  }

  console.log(
    "DefineAuthChallenge - Resposta:",
    JSON.stringify(event.response, null, 2)
  );
  return event;
}

async function handleCreateAuth(event: CreateAuthChallengeTriggerEvent) {
  const { session } = event.request;
  const lastSession = session[session.length - 1];

  // Verificar se o último desafio foi bem-sucedido antes de gerar o código MFA
  if (
    session.length === 0 ||
    (lastSession && lastSession.challengeResult === true)
  ) {
    // Gerar e enviar código MFA
    const mfaCode = generateMFACode();
    const email = event.request.userAttributes.email;

    console.log("Gerando código MFA para email:", email);
    console.log("Código MFA gerado:", mfaCode);

    await sendMFACodeEmail(email, mfaCode);
    const sessionToken = await storeMFACode(email, mfaCode);

    console.log("Código MFA armazenado com sessionToken:", sessionToken);

    event.response.challengeMetadata = "MFA_CHALLENGE";
    event.response.privateChallengeParameters = {
      code: sessionToken,
      mfaCode: mfaCode,
    };
    event.response.publicChallengeParameters = { type: "MFA_CODE" };
  } else {
    // Se o último desafio falhou, não gerar novo código
    event.response.challengeMetadata = "FAILED_CHALLENGE";
    event.response.privateChallengeParameters = {};
    event.response.publicChallengeParameters = { type: "FAILED" };
  }

  return event;
}

async function handleVerifyAuth(
  event: VerifyAuthChallengeResponseTriggerEvent
) {
  console.log("Iniciando verificação do código MFA");
  console.log("Event:", JSON.stringify(event, null, 2));

  const mfaCode = event.request.privateChallengeParameters.mfaCode;
  const userAnswer = event.request.challengeAnswer;

  console.log("Código MFA armazenado:", mfaCode);
  console.log("Código MFA fornecido:", userAnswer);

  // Verificar se o código fornecido corresponde ao código armazenado
  const isValid = mfaCode === userAnswer;
  console.log("Códigos correspondem?", isValid);

  event.response.answerCorrect = isValid;
  return event;
}
