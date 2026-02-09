import { generateClient } from "aws-amplify/api";

export type GraphQLErrorLike = {
  message?: string;
  errorType?: string;
};

export type GraphQLResultLike<TData> = {
  data?: TData;
  errors?: GraphQLErrorLike[];
};

export type AmplifyGraphQLClient = {
  graphql: <TData = unknown, TVariables = unknown>(args: {
    query: string;
    variables?: TVariables;
  }) => Promise<GraphQLResultLike<TData>>;
};

let _client: unknown | null = null;

export function getClient(): AmplifyGraphQLClient {
  if (!_client) {
    _client = generateClient();
  }
  return _client as AmplifyGraphQLClient;
}