import {
  CloudFormationClient,
  DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";
import dotenv from "dotenv";

dotenv.config();

const region = process.env.AWS_REGION || "us-east-1";
const stage = process.env.STAGE || "dev";
const stackName = `user-management-api-${stage}`;

const cloudformation = new CloudFormationClient({ region });

const getApiUrl = async (): Promise<string> => {
  try {
    const command = new DescribeStacksCommand({
      StackName: stackName,
    });

    const response = await cloudformation.send(command);
    const stack = response.Stacks?.[0];

    if (!stack) {
      throw new Error(`Stack ${stackName} não encontrada`);
    }

    const serviceEndpointOutput = stack.Outputs?.find(
      (output) => output.OutputKey === "ServiceEndpoint"
    );

    if (!serviceEndpointOutput?.OutputValue) {
      throw new Error("URL da API não encontrada nos outputs da stack");
    }

    return serviceEndpointOutput.OutputValue;
  } catch (error) {
    console.error("Erro ao buscar URL da API:", error);
    throw error;
  }
};

const init = async (): Promise<void> => {
  try {
    const apiUrl = await getApiUrl();
    console.log("URL da API:", apiUrl);
  } catch (error) {
    console.error("Erro ao obter URL da API:", error);
    process.exit(1);
  }
};

if (require.main === module) {
  init();
}

export { getApiUrl };
