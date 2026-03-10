export const amplifyConfiguration = {
  aws_project_region: "us-east-2",
  aws_cognito_identity_pool_id: "us-east-2:16cbff73-6545-49d7-bf76-35a6658fd6ab",
  aws_cognito_region: "us-east-2",
  aws_user_pools_id: "us-east-2_2ZHxRv3hL",
  aws_user_pools_web_client_id: "5qc7pcejsu0s5m8qn4bjhda9d3",
  oauth: {},
  aws_cognito_username_attributes: [],
  aws_cognito_social_providers: [],
  aws_cognito_signup_attributes: ["EMAIL", "NAME"],
  aws_cognito_mfa_configuration: "OFF",
  aws_cognito_mfa_types: ["SMS"],
  aws_cognito_password_protection_settings: {
    passwordPolicyMinLength: 8,
    passwordPolicyCharacters: [],
  },
  aws_cognito_verification_mechanisms: ["EMAIL"],
  aws_appsync_graphqlEndpoint: "https://hxluxrtljvds5bznlrq6wc2hoy.appsync-api.us-east-2.amazonaws.com/graphql",
  aws_appsync_region: "us-east-2",
  aws_appsync_authenticationType: "AMAZON_COGNITO_USER_POOLS",
  aws_cloud_logic_custom: [
    {
      name: "taskmasterAuth",
      endpoint: "https://56c8aw2ujg.execute-api.us-east-2.amazonaws.com/dev",
      region: "us-east-2",
    },
  ],
} as const;

export default amplifyConfiguration;
