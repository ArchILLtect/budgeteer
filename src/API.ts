/* tslint:disable */
//  This file was automatically generated and should not be edited.

export type CreateTaskListInput = {
  id?: string | null,
  owner: string,
  name: string,
  description?: string | null,
  isDemo: boolean,
  isFavorite: boolean,
  sortOrder: number,
};

export type ModelTaskListConditionInput = {
  owner?: ModelStringInput | null,
  name?: ModelStringInput | null,
  description?: ModelStringInput | null,
  isDemo?: ModelBooleanInput | null,
  isFavorite?: ModelBooleanInput | null,
  sortOrder?: ModelIntInput | null,
  and?: Array< ModelTaskListConditionInput | null > | null,
  or?: Array< ModelTaskListConditionInput | null > | null,
  not?: ModelTaskListConditionInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelStringInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  attributeExists?: boolean | null,
  attributeType?: typeof ModelAttributeTypes[keyof typeof ModelAttributeTypes] | null,
  size?: ModelSizeInput | null,
};

export const ModelAttributeTypes = {
  binary: "binary",
  binarySet: "binarySet",
  bool: "bool",
  list: "list",
  map: "map",
  number: "number",
  numberSet: "numberSet",
  string: "string",
  stringSet: "stringSet",
  _null: "_null",
}


export type ModelSizeInput = {
  ne?: number | null,
  eq?: number | null,
  le?: number | null,
  lt?: number | null,
  ge?: number | null,
  gt?: number | null,
  between?: Array< number | null > | null,
};

export type ModelBooleanInput = {
  ne?: boolean | null,
  eq?: boolean | null,
  attributeExists?: boolean | null,
  attributeType?: typeof ModelAttributeTypes[keyof typeof ModelAttributeTypes] | null,
};

export type ModelIntInput = {
  ne?: number | null,
  eq?: number | null,
  le?: number | null,
  lt?: number | null,
  ge?: number | null,
  gt?: number | null,
  between?: Array< number | null > | null,
  attributeExists?: boolean | null,
  attributeType?: typeof ModelAttributeTypes[keyof typeof ModelAttributeTypes] | null,
};

export type TaskList = {
  __typename: "TaskList",
  id: string,
  owner: string,
  name: string,
  description?: string | null,
  isDemo: boolean,
  isFavorite: boolean,
  sortOrder: number,
  tasks?: ModelTaskConnection | null,
  createdAt: string,
  updatedAt: string,
};

export type ModelTaskConnection = {
  __typename: "ModelTaskConnection",
  items:  Array<Task | null >,
  nextToken?: string | null,
};

export type Task = {
  __typename: "Task",
  id: string,
  owner: string,
  listId: string,
  sortOrder: number,
  parentTaskId?: string | null,
  title: string,
  description?: string | null,
  status: TaskStatus,
  priority: TaskPriority,
  dueAt?: string | null,
  completedAt?: string | null,
  assigneeId?: string | null,
  tagIds: Array< string >,
  isDemo: boolean,
  list?: TaskList | null,
  createdAt: string,
  updatedAt: string,
};

export type TaskStatus = "Open" | "Done";

export type TaskPriority = "Low" | "Medium" | "High";

export type UpdateTaskListInput = {
  id: string,
  owner?: string | null,
  name?: string | null,
  description?: string | null,
  isDemo?: boolean | null,
  isFavorite?: boolean | null,
  sortOrder?: number | null,
};

export type DeleteTaskListInput = {
  id: string,
};

export type CreateTaskInput = {
  id?: string | null,
  owner: string,
  listId: string,
  sortOrder: number,
  parentTaskId?: string | null,
  title: string,
  description?: string | null,
  status: TaskStatus,
  priority: TaskPriority,
  dueAt?: string | null,
  completedAt?: string | null,
  assigneeId?: string | null,
  tagIds: Array< string >,
  isDemo: boolean,
};

export type ModelTaskConditionInput = {
  owner?: ModelStringInput | null,
  listId?: ModelIDInput | null,
  sortOrder?: ModelIntInput | null,
  parentTaskId?: ModelIDInput | null,
  title?: ModelStringInput | null,
  description?: ModelStringInput | null,
  status?: ModelTaskStatusInput | null,
  priority?: ModelTaskPriorityInput | null,
  dueAt?: ModelStringInput | null,
  completedAt?: ModelStringInput | null,
  assigneeId?: ModelStringInput | null,
  tagIds?: ModelStringInput | null,
  isDemo?: ModelBooleanInput | null,
  and?: Array< ModelTaskConditionInput | null > | null,
  or?: Array< ModelTaskConditionInput | null > | null,
  not?: ModelTaskConditionInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelIDInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  attributeExists?: boolean | null,
  attributeType?: typeof ModelAttributeTypes[keyof typeof ModelAttributeTypes] | null,
  size?: ModelSizeInput | null,
};

export type ModelTaskStatusInput = {
  eq?: TaskStatus | null,
  ne?: TaskStatus | null,
};

export type ModelTaskPriorityInput = {
  eq?: TaskPriority | null,
  ne?: TaskPriority | null,
};

export type UpdateTaskInput = {
  id: string,
  owner?: string | null,
  listId?: string | null,
  sortOrder?: number | null,
  parentTaskId?: string | null,
  title?: string | null,
  description?: string | null,
  status?: TaskStatus | null,
  priority?: TaskPriority | null,
  dueAt?: string | null,
  completedAt?: string | null,
  assigneeId?: string | null,
  tagIds?: Array< string > | null,
  isDemo?: boolean | null,
};

export type DeleteTaskInput = {
  id: string,
};

export type CreateUserProfileInput = {
  id?: string | null,
  owner: string,
  planTier: typeof PlanTier[keyof typeof PlanTier],
  defaultVisibility: typeof DefaultVisibility[keyof typeof DefaultVisibility],
  seedVersion: number,
  seededAt?: string | null,
  onboardingVersion: number,
  onboarding?: string | null,
  onboardingUpdatedAt?: string | null,
  settingsVersion: number,
  settings?: string | null,
  settingsUpdatedAt?: string | null,
  displayName?: string | null,
  email: string,
  avatarUrl?: string | null,
  lastSeenAt?: string | null,
  preferredName?: string | null,
  bio?: string | null,
  timezone?: string | null,
  locale?: string | null,
  lastDeviceId?: string | null,
  acceptedTermsAt?: string | null,
};

export const PlanTier = {
  FREE: "FREE",
  DEMO: "DEMO",
  PRO: "PRO",
} as const;

export const DefaultVisibility = {
  PRIVATE: "PRIVATE",
  TEAM: "TEAM",
  PUBLIC: "PUBLIC",
} as const;

export type ModelUserProfileConditionInput = {
  owner?: ModelStringInput | null,
  planTier?: ModelPlanTierInput | null,
  defaultVisibility?: ModelDefaultVisibilityInput | null,
  seedVersion?: ModelIntInput | null,
  seededAt?: ModelStringInput | null,
  onboardingVersion?: ModelIntInput | null,
  onboarding?: ModelStringInput | null,
  onboardingUpdatedAt?: ModelStringInput | null,
  settingsVersion?: ModelIntInput | null,
  settings?: ModelStringInput | null,
  settingsUpdatedAt?: ModelStringInput | null,
  displayName?: ModelStringInput | null,
  email?: ModelStringInput | null,
  avatarUrl?: ModelStringInput | null,
  lastSeenAt?: ModelStringInput | null,
  preferredName?: ModelStringInput | null,
  bio?: ModelStringInput | null,
  timezone?: ModelStringInput | null,
  locale?: ModelStringInput | null,
  lastDeviceId?: ModelStringInput | null,
  acceptedTermsAt?: ModelStringInput | null,
  and?: Array< ModelUserProfileConditionInput | null > | null,
  or?: Array< ModelUserProfileConditionInput | null > | null,
  not?: ModelUserProfileConditionInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
};

export type ModelPlanTierInput = {
  eq?: typeof PlanTier[keyof typeof PlanTier] | null,
  ne?: typeof PlanTier[keyof typeof PlanTier] | null,
};

export type ModelDefaultVisibilityInput = {
  eq?: typeof DefaultVisibility[keyof typeof DefaultVisibility] | null,
  ne?: typeof DefaultVisibility[keyof typeof DefaultVisibility] | null,
};

export type UserProfile = {
  __typename: "UserProfile",
  id: string,
  owner: string,
  planTier: typeof PlanTier[keyof typeof PlanTier],
  defaultVisibility: typeof DefaultVisibility[keyof typeof DefaultVisibility],
  seedVersion: number,
  seededAt?: string | null,
  onboardingVersion: number,
  onboarding?: string | null,
  onboardingUpdatedAt?: string | null,
  settingsVersion: number,
  settings?: string | null,
  settingsUpdatedAt?: string | null,
  displayName?: string | null,
  email: string,
  avatarUrl?: string | null,
  lastSeenAt?: string | null,
  preferredName?: string | null,
  bio?: string | null,
  timezone?: string | null,
  locale?: string | null,
  lastDeviceId?: string | null,
  acceptedTermsAt?: string | null,
  createdAt: string,
  updatedAt: string,
};

export type UpdateUserProfileInput = {
  id: string,
  owner?: string | null,
  planTier?: typeof PlanTier[keyof typeof PlanTier] | null,
  defaultVisibility?: typeof DefaultVisibility[keyof typeof DefaultVisibility] | null,
  seedVersion?: number | null,
  seededAt?: string | null,
  onboardingVersion?: number | null,
  onboarding?: string | null,
  onboardingUpdatedAt?: string | null,
  settingsVersion?: number | null,
  settings?: string | null,
  settingsUpdatedAt?: string | null,
  displayName?: string | null,
  email?: string | null,
  avatarUrl?: string | null,
  lastSeenAt?: string | null,
  preferredName?: string | null,
  bio?: string | null,
  timezone?: string | null,
  locale?: string | null,
  lastDeviceId?: string | null,
  acceptedTermsAt?: string | null,
};

export type DeleteUserProfileInput = {
  id: string,
};

export type ModelTaskListFilterInput = {
  id?: ModelIDInput | null,
  owner?: ModelStringInput | null,
  name?: ModelStringInput | null,
  description?: ModelStringInput | null,
  isDemo?: ModelBooleanInput | null,
  isFavorite?: ModelBooleanInput | null,
  sortOrder?: ModelIntInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  and?: Array< ModelTaskListFilterInput | null > | null,
  or?: Array< ModelTaskListFilterInput | null > | null,
  not?: ModelTaskListFilterInput | null,
};

export type ModelSortDirection = "ASC" | "DESC";

export type ModelTaskListConnection = {
  __typename: "ModelTaskListConnection",
  items:  Array<TaskList | null >,
  nextToken?: string | null,
};

export type ModelTaskFilterInput = {
  id?: ModelIDInput | null,
  owner?: ModelStringInput | null,
  listId?: ModelIDInput | null,
  sortOrder?: ModelIntInput | null,
  parentTaskId?: ModelIDInput | null,
  title?: ModelStringInput | null,
  description?: ModelStringInput | null,
  status?: ModelTaskStatusInput | null,
  priority?: ModelTaskPriorityInput | null,
  dueAt?: ModelStringInput | null,
  completedAt?: ModelStringInput | null,
  assigneeId?: ModelStringInput | null,
  tagIds?: ModelStringInput | null,
  isDemo?: ModelBooleanInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  and?: Array< ModelTaskFilterInput | null > | null,
  or?: Array< ModelTaskFilterInput | null > | null,
  not?: ModelTaskFilterInput | null,
};

export type ModelUserProfileFilterInput = {
  id?: ModelIDInput | null,
  owner?: ModelStringInput | null,
  planTier?: ModelPlanTierInput | null,
  defaultVisibility?: ModelDefaultVisibilityInput | null,
  seedVersion?: ModelIntInput | null,
  seededAt?: ModelStringInput | null,
  onboardingVersion?: ModelIntInput | null,
  onboarding?: ModelStringInput | null,
  onboardingUpdatedAt?: ModelStringInput | null,
  settingsVersion?: ModelIntInput | null,
  settings?: ModelStringInput | null,
  settingsUpdatedAt?: ModelStringInput | null,
  displayName?: ModelStringInput | null,
  email?: ModelStringInput | null,
  avatarUrl?: ModelStringInput | null,
  lastSeenAt?: ModelStringInput | null,
  preferredName?: ModelStringInput | null,
  bio?: ModelStringInput | null,
  timezone?: ModelStringInput | null,
  locale?: ModelStringInput | null,
  lastDeviceId?: ModelStringInput | null,
  acceptedTermsAt?: ModelStringInput | null,
  createdAt?: ModelStringInput | null,
  updatedAt?: ModelStringInput | null,
  and?: Array< ModelUserProfileFilterInput | null > | null,
  or?: Array< ModelUserProfileFilterInput | null > | null,
  not?: ModelUserProfileFilterInput | null,
};

export type ModelUserProfileConnection = {
  __typename: "ModelUserProfileConnection",
  items:  Array<UserProfile | null >,
  nextToken?: string | null,
};

export type ModelIntKeyConditionInput = {
  eq?: number | null,
  le?: number | null,
  lt?: number | null,
  ge?: number | null,
  gt?: number | null,
  between?: Array< number | null > | null,
};

export type ModelSubscriptionTaskListFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  name?: ModelSubscriptionStringInput | null,
  description?: ModelSubscriptionStringInput | null,
  isDemo?: ModelSubscriptionBooleanInput | null,
  isFavorite?: ModelSubscriptionBooleanInput | null,
  sortOrder?: ModelSubscriptionIntInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionTaskListFilterInput | null > | null,
  or?: Array< ModelSubscriptionTaskListFilterInput | null > | null,
  owner?: ModelStringInput | null,
};

export type ModelSubscriptionIDInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  in?: Array< string | null > | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionStringInput = {
  ne?: string | null,
  eq?: string | null,
  le?: string | null,
  lt?: string | null,
  ge?: string | null,
  gt?: string | null,
  contains?: string | null,
  notContains?: string | null,
  between?: Array< string | null > | null,
  beginsWith?: string | null,
  in?: Array< string | null > | null,
  notIn?: Array< string | null > | null,
};

export type ModelSubscriptionBooleanInput = {
  ne?: boolean | null,
  eq?: boolean | null,
};

export type ModelSubscriptionIntInput = {
  ne?: number | null,
  eq?: number | null,
  le?: number | null,
  lt?: number | null,
  ge?: number | null,
  gt?: number | null,
  between?: Array< number | null > | null,
  in?: Array< number | null > | null,
  notIn?: Array< number | null > | null,
};

export type ModelSubscriptionTaskFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  listId?: ModelSubscriptionIDInput | null,
  sortOrder?: ModelSubscriptionIntInput | null,
  parentTaskId?: ModelSubscriptionIDInput | null,
  title?: ModelSubscriptionStringInput | null,
  description?: ModelSubscriptionStringInput | null,
  status?: ModelSubscriptionStringInput | null,
  priority?: ModelSubscriptionStringInput | null,
  dueAt?: ModelSubscriptionStringInput | null,
  completedAt?: ModelSubscriptionStringInput | null,
  assigneeId?: ModelSubscriptionStringInput | null,
  tagIds?: ModelSubscriptionStringInput | null,
  isDemo?: ModelSubscriptionBooleanInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionTaskFilterInput | null > | null,
  or?: Array< ModelSubscriptionTaskFilterInput | null > | null,
  owner?: ModelStringInput | null,
};

export type ModelSubscriptionUserProfileFilterInput = {
  id?: ModelSubscriptionIDInput | null,
  planTier?: ModelSubscriptionStringInput | null,
  defaultVisibility?: ModelSubscriptionStringInput | null,
  seedVersion?: ModelSubscriptionIntInput | null,
  seededAt?: ModelSubscriptionStringInput | null,
  onboardingVersion?: ModelSubscriptionIntInput | null,
  onboarding?: ModelSubscriptionStringInput | null,
  onboardingUpdatedAt?: ModelSubscriptionStringInput | null,
  settingsVersion?: ModelSubscriptionIntInput | null,
  settings?: ModelSubscriptionStringInput | null,
  settingsUpdatedAt?: ModelSubscriptionStringInput | null,
  displayName?: ModelSubscriptionStringInput | null,
  email?: ModelSubscriptionStringInput | null,
  avatarUrl?: ModelSubscriptionStringInput | null,
  lastSeenAt?: ModelSubscriptionStringInput | null,
  preferredName?: ModelSubscriptionStringInput | null,
  bio?: ModelSubscriptionStringInput | null,
  timezone?: ModelSubscriptionStringInput | null,
  locale?: ModelSubscriptionStringInput | null,
  lastDeviceId?: ModelSubscriptionStringInput | null,
  acceptedTermsAt?: ModelSubscriptionStringInput | null,
  createdAt?: ModelSubscriptionStringInput | null,
  updatedAt?: ModelSubscriptionStringInput | null,
  and?: Array< ModelSubscriptionUserProfileFilterInput | null > | null,
  or?: Array< ModelSubscriptionUserProfileFilterInput | null > | null,
  owner?: ModelStringInput | null,
};

export type CreateTaskListMutationVariables = {
  input: CreateTaskListInput,
  condition?: ModelTaskListConditionInput | null,
};

export type CreateTaskListMutation = {
  createTaskList?:  {
    __typename: "TaskList",
    id: string,
    owner: string,
    name: string,
    description?: string | null,
    isDemo: boolean,
    isFavorite: boolean,
    sortOrder: number,
    tasks?:  {
      __typename: "ModelTaskConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type UpdateTaskListMutationVariables = {
  input: UpdateTaskListInput,
  condition?: ModelTaskListConditionInput | null,
};

export type UpdateTaskListMutation = {
  updateTaskList?:  {
    __typename: "TaskList",
    id: string,
    owner: string,
    name: string,
    description?: string | null,
    isDemo: boolean,
    isFavorite: boolean,
    sortOrder: number,
    tasks?:  {
      __typename: "ModelTaskConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type DeleteTaskListMutationVariables = {
  input: DeleteTaskListInput,
  condition?: ModelTaskListConditionInput | null,
};

export type DeleteTaskListMutation = {
  deleteTaskList?:  {
    __typename: "TaskList",
    id: string,
    owner: string,
    name: string,
    description?: string | null,
    isDemo: boolean,
    isFavorite: boolean,
    sortOrder: number,
    tasks?:  {
      __typename: "ModelTaskConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type CreateTaskMutationVariables = {
  input: CreateTaskInput,
  condition?: ModelTaskConditionInput | null,
};

export type CreateTaskMutation = {
  createTask?:  {
    __typename: "Task",
    id: string,
    owner: string,
    listId: string,
    sortOrder: number,
    parentTaskId?: string | null,
    title: string,
    description?: string | null,
    status: TaskStatus,
    priority: TaskPriority,
    dueAt?: string | null,
    completedAt?: string | null,
    assigneeId?: string | null,
    tagIds: Array< string >,
    isDemo: boolean,
    list?:  {
      __typename: "TaskList",
      id: string,
      owner: string,
      name: string,
      description?: string | null,
      isDemo: boolean,
      isFavorite: boolean,
      sortOrder: number,
      createdAt: string,
      updatedAt: string,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type UpdateTaskMutationVariables = {
  input: UpdateTaskInput,
  condition?: ModelTaskConditionInput | null,
};

export type UpdateTaskMutation = {
  updateTask?:  {
    __typename: "Task",
    id: string,
    owner: string,
    listId: string,
    sortOrder: number,
    parentTaskId?: string | null,
    title: string,
    description?: string | null,
    status: TaskStatus,
    priority: TaskPriority,
    dueAt?: string | null,
    completedAt?: string | null,
    assigneeId?: string | null,
    tagIds: Array< string >,
    isDemo: boolean,
    list?:  {
      __typename: "TaskList",
      id: string,
      owner: string,
      name: string,
      description?: string | null,
      isDemo: boolean,
      isFavorite: boolean,
      sortOrder: number,
      createdAt: string,
      updatedAt: string,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type DeleteTaskMutationVariables = {
  input: DeleteTaskInput,
  condition?: ModelTaskConditionInput | null,
};

export type DeleteTaskMutation = {
  deleteTask?:  {
    __typename: "Task",
    id: string,
    owner: string,
    listId: string,
    sortOrder: number,
    parentTaskId?: string | null,
    title: string,
    description?: string | null,
    status: TaskStatus,
    priority: TaskPriority,
    dueAt?: string | null,
    completedAt?: string | null,
    assigneeId?: string | null,
    tagIds: Array< string >,
    isDemo: boolean,
    list?:  {
      __typename: "TaskList",
      id: string,
      owner: string,
      name: string,
      description?: string | null,
      isDemo: boolean,
      isFavorite: boolean,
      sortOrder: number,
      createdAt: string,
      updatedAt: string,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type CreateUserProfileMutationVariables = {
  input: CreateUserProfileInput,
  condition?: ModelUserProfileConditionInput | null,
};

export type CreateUserProfileMutation = {
  createUserProfile?:  {
    __typename: "UserProfile",
    id: string,
    owner: string,
    planTier: typeof PlanTier[keyof typeof PlanTier],
    defaultVisibility: typeof DefaultVisibility[keyof typeof DefaultVisibility],
    seedVersion: number,
    seededAt?: string | null,
    onboardingVersion: number,
    onboarding?: string | null,
    onboardingUpdatedAt?: string | null,
    settingsVersion: number,
    settings?: string | null,
    settingsUpdatedAt?: string | null,
    displayName?: string | null,
    email: string,
    avatarUrl?: string | null,
    lastSeenAt?: string | null,
    preferredName?: string | null,
    bio?: string | null,
    timezone?: string | null,
    locale?: string | null,
    lastDeviceId?: string | null,
    acceptedTermsAt?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type UpdateUserProfileMutationVariables = {
  input: UpdateUserProfileInput,
  condition?: ModelUserProfileConditionInput | null,
};

export type UpdateUserProfileMutation = {
  updateUserProfile?:  {
    __typename: "UserProfile",
    id: string,
    owner: string,
    planTier: typeof PlanTier[keyof typeof PlanTier],
    defaultVisibility: typeof DefaultVisibility[keyof typeof DefaultVisibility],
    seedVersion: number,
    seededAt?: string | null,
    onboardingVersion: number,
    onboarding?: string | null,
    onboardingUpdatedAt?: string | null,
    settingsVersion: number,
    settings?: string | null,
    settingsUpdatedAt?: string | null,
    displayName?: string | null,
    email: string,
    avatarUrl?: string | null,
    lastSeenAt?: string | null,
    preferredName?: string | null,
    bio?: string | null,
    timezone?: string | null,
    locale?: string | null,
    lastDeviceId?: string | null,
    acceptedTermsAt?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type DeleteUserProfileMutationVariables = {
  input: DeleteUserProfileInput,
  condition?: ModelUserProfileConditionInput | null,
};

export type DeleteUserProfileMutation = {
  deleteUserProfile?:  {
    __typename: "UserProfile",
    id: string,
    owner: string,
    planTier: typeof PlanTier[keyof typeof PlanTier],
    defaultVisibility: typeof DefaultVisibility[keyof typeof DefaultVisibility],
    seedVersion: number,
    seededAt?: string | null,
    onboardingVersion: number,
    onboarding?: string | null,
    onboardingUpdatedAt?: string | null,
    settingsVersion: number,
    settings?: string | null,
    settingsUpdatedAt?: string | null,
    displayName?: string | null,
    email: string,
    avatarUrl?: string | null,
    lastSeenAt?: string | null,
    preferredName?: string | null,
    bio?: string | null,
    timezone?: string | null,
    locale?: string | null,
    lastDeviceId?: string | null,
    acceptedTermsAt?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type GetTaskListQueryVariables = {
  id: string,
};

export type GetTaskListQuery = {
  getTaskList?:  {
    __typename: "TaskList",
    id: string,
    owner: string,
    name: string,
    description?: string | null,
    isDemo: boolean,
    isFavorite: boolean,
    sortOrder: number,
    tasks?:  {
      __typename: "ModelTaskConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type ListTaskListsQueryVariables = {
  id?: string | null,
  filter?: ModelTaskListFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListTaskListsQuery = {
  listTaskLists?:  {
    __typename: "ModelTaskListConnection",
    items:  Array< {
      __typename: "TaskList",
      id: string,
      owner: string,
      name: string,
      description?: string | null,
      isDemo: boolean,
      isFavorite: boolean,
      sortOrder: number,
      createdAt: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type GetTaskQueryVariables = {
  id: string,
};

export type GetTaskQuery = {
  getTask?:  {
    __typename: "Task",
    id: string,
    owner: string,
    listId: string,
    sortOrder: number,
    parentTaskId?: string | null,
    title: string,
    description?: string | null,
    status: TaskStatus,
    priority: TaskPriority,
    dueAt?: string | null,
    completedAt?: string | null,
    assigneeId?: string | null,
    tagIds: Array< string >,
    isDemo: boolean,
    list?:  {
      __typename: "TaskList",
      id: string,
      owner: string,
      name: string,
      description?: string | null,
      isDemo: boolean,
      isFavorite: boolean,
      sortOrder: number,
      createdAt: string,
      updatedAt: string,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type ListTasksQueryVariables = {
  id?: string | null,
  filter?: ModelTaskFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListTasksQuery = {
  listTasks?:  {
    __typename: "ModelTaskConnection",
    items:  Array< {
      __typename: "Task",
      id: string,
      owner: string,
      listId: string,
      sortOrder: number,
      parentTaskId?: string | null,
      title: string,
      description?: string | null,
      status: TaskStatus,
      priority: TaskPriority,
      dueAt?: string | null,
      completedAt?: string | null,
      assigneeId?: string | null,
      tagIds: Array< string >,
      isDemo: boolean,
      createdAt: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type GetUserProfileQueryVariables = {
  id: string,
};

export type GetUserProfileQuery = {
  getUserProfile?:  {
    __typename: "UserProfile",
    id: string,
    owner: string,
    planTier: typeof PlanTier[keyof typeof PlanTier],
    defaultVisibility: typeof DefaultVisibility[keyof typeof DefaultVisibility],
    seedVersion: number,
    seededAt?: string | null,
    onboardingVersion: number,
    onboarding?: string | null,
    onboardingUpdatedAt?: string | null,
    settingsVersion: number,
    settings?: string | null,
    settingsUpdatedAt?: string | null,
    displayName?: string | null,
    email: string,
    avatarUrl?: string | null,
    lastSeenAt?: string | null,
    preferredName?: string | null,
    bio?: string | null,
    timezone?: string | null,
    locale?: string | null,
    lastDeviceId?: string | null,
    acceptedTermsAt?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type ListUserProfilesQueryVariables = {
  id?: string | null,
  filter?: ModelUserProfileFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
  sortDirection?: ModelSortDirection | null,
};

export type ListUserProfilesQuery = {
  listUserProfiles?:  {
    __typename: "ModelUserProfileConnection",
    items:  Array< {
      __typename: "UserProfile",
      id: string,
      owner: string,
      planTier: typeof PlanTier[keyof typeof PlanTier],
      defaultVisibility: typeof DefaultVisibility[keyof typeof DefaultVisibility],
      seedVersion: number,
      seededAt?: string | null,
      onboardingVersion: number,
      onboarding?: string | null,
      onboardingUpdatedAt?: string | null,
      settingsVersion: number,
      settings?: string | null,
      settingsUpdatedAt?: string | null,
      displayName?: string | null,
      email: string,
      avatarUrl?: string | null,
      lastSeenAt?: string | null,
      preferredName?: string | null,
      bio?: string | null,
      timezone?: string | null,
      locale?: string | null,
      lastDeviceId?: string | null,
      acceptedTermsAt?: string | null,
      createdAt: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type TasksByListQueryVariables = {
  listId: string,
  sortOrder?: ModelIntKeyConditionInput | null,
  sortDirection?: ModelSortDirection | null,
  filter?: ModelTaskFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type TasksByListQuery = {
  tasksByList?:  {
    __typename: "ModelTaskConnection",
    items:  Array< {
      __typename: "Task",
      id: string,
      owner: string,
      listId: string,
      sortOrder: number,
      parentTaskId?: string | null,
      title: string,
      description?: string | null,
      status: TaskStatus,
      priority: TaskPriority,
      dueAt?: string | null,
      completedAt?: string | null,
      assigneeId?: string | null,
      tagIds: Array< string >,
      isDemo: boolean,
      createdAt: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type TasksByParentQueryVariables = {
  parentTaskId: string,
  sortOrder?: ModelIntKeyConditionInput | null,
  sortDirection?: ModelSortDirection | null,
  filter?: ModelTaskFilterInput | null,
  limit?: number | null,
  nextToken?: string | null,
};

export type TasksByParentQuery = {
  tasksByParent?:  {
    __typename: "ModelTaskConnection",
    items:  Array< {
      __typename: "Task",
      id: string,
      owner: string,
      listId: string,
      sortOrder: number,
      parentTaskId?: string | null,
      title: string,
      description?: string | null,
      status: TaskStatus,
      priority: TaskPriority,
      dueAt?: string | null,
      completedAt?: string | null,
      assigneeId?: string | null,
      tagIds: Array< string >,
      isDemo: boolean,
      createdAt: string,
      updatedAt: string,
    } | null >,
    nextToken?: string | null,
  } | null,
};

export type OnCreateTaskListSubscriptionVariables = {
  filter?: ModelSubscriptionTaskListFilterInput | null,
  owner?: string | null,
};

export type OnCreateTaskListSubscription = {
  onCreateTaskList?:  {
    __typename: "TaskList",
    id: string,
    owner: string,
    name: string,
    description?: string | null,
    isDemo: boolean,
    isFavorite: boolean,
    sortOrder: number,
    tasks?:  {
      __typename: "ModelTaskConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnUpdateTaskListSubscriptionVariables = {
  filter?: ModelSubscriptionTaskListFilterInput | null,
  owner?: string | null,
};

export type OnUpdateTaskListSubscription = {
  onUpdateTaskList?:  {
    __typename: "TaskList",
    id: string,
    owner: string,
    name: string,
    description?: string | null,
    isDemo: boolean,
    isFavorite: boolean,
    sortOrder: number,
    tasks?:  {
      __typename: "ModelTaskConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnDeleteTaskListSubscriptionVariables = {
  filter?: ModelSubscriptionTaskListFilterInput | null,
  owner?: string | null,
};

export type OnDeleteTaskListSubscription = {
  onDeleteTaskList?:  {
    __typename: "TaskList",
    id: string,
    owner: string,
    name: string,
    description?: string | null,
    isDemo: boolean,
    isFavorite: boolean,
    sortOrder: number,
    tasks?:  {
      __typename: "ModelTaskConnection",
      nextToken?: string | null,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnCreateTaskSubscriptionVariables = {
  filter?: ModelSubscriptionTaskFilterInput | null,
  owner?: string | null,
};

export type OnCreateTaskSubscription = {
  onCreateTask?:  {
    __typename: "Task",
    id: string,
    owner: string,
    listId: string,
    sortOrder: number,
    parentTaskId?: string | null,
    title: string,
    description?: string | null,
    status: TaskStatus,
    priority: TaskPriority,
    dueAt?: string | null,
    completedAt?: string | null,
    assigneeId?: string | null,
    tagIds: Array< string >,
    isDemo: boolean,
    list?:  {
      __typename: "TaskList",
      id: string,
      owner: string,
      name: string,
      description?: string | null,
      isDemo: boolean,
      isFavorite: boolean,
      sortOrder: number,
      createdAt: string,
      updatedAt: string,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnUpdateTaskSubscriptionVariables = {
  filter?: ModelSubscriptionTaskFilterInput | null,
  owner?: string | null,
};

export type OnUpdateTaskSubscription = {
  onUpdateTask?:  {
    __typename: "Task",
    id: string,
    owner: string,
    listId: string,
    sortOrder: number,
    parentTaskId?: string | null,
    title: string,
    description?: string | null,
    status: TaskStatus,
    priority: TaskPriority,
    dueAt?: string | null,
    completedAt?: string | null,
    assigneeId?: string | null,
    tagIds: Array< string >,
    isDemo: boolean,
    list?:  {
      __typename: "TaskList",
      id: string,
      owner: string,
      name: string,
      description?: string | null,
      isDemo: boolean,
      isFavorite: boolean,
      sortOrder: number,
      createdAt: string,
      updatedAt: string,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnDeleteTaskSubscriptionVariables = {
  filter?: ModelSubscriptionTaskFilterInput | null,
  owner?: string | null,
};

export type OnDeleteTaskSubscription = {
  onDeleteTask?:  {
    __typename: "Task",
    id: string,
    owner: string,
    listId: string,
    sortOrder: number,
    parentTaskId?: string | null,
    title: string,
    description?: string | null,
    status: TaskStatus,
    priority: TaskPriority,
    dueAt?: string | null,
    completedAt?: string | null,
    assigneeId?: string | null,
    tagIds: Array< string >,
    isDemo: boolean,
    list?:  {
      __typename: "TaskList",
      id: string,
      owner: string,
      name: string,
      description?: string | null,
      isDemo: boolean,
      isFavorite: boolean,
      sortOrder: number,
      createdAt: string,
      updatedAt: string,
    } | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnCreateUserProfileSubscriptionVariables = {
  filter?: ModelSubscriptionUserProfileFilterInput | null,
  owner?: string | null,
};

export type OnCreateUserProfileSubscription = {
  onCreateUserProfile?:  {
    __typename: "UserProfile",
    id: string,
    owner: string,
    planTier: typeof PlanTier[keyof typeof PlanTier],
    defaultVisibility: typeof DefaultVisibility[keyof typeof DefaultVisibility],
    seedVersion: number,
    seededAt?: string | null,
    onboardingVersion: number,
    onboarding?: string | null,
    onboardingUpdatedAt?: string | null,
    settingsVersion: number,
    settings?: string | null,
    settingsUpdatedAt?: string | null,
    displayName?: string | null,
    email: string,
    avatarUrl?: string | null,
    lastSeenAt?: string | null,
    preferredName?: string | null,
    bio?: string | null,
    timezone?: string | null,
    locale?: string | null,
    lastDeviceId?: string | null,
    acceptedTermsAt?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnUpdateUserProfileSubscriptionVariables = {
  filter?: ModelSubscriptionUserProfileFilterInput | null,
  owner?: string | null,
};

export type OnUpdateUserProfileSubscription = {
  onUpdateUserProfile?:  {
    __typename: "UserProfile",
    id: string,
    owner: string,
    planTier: typeof PlanTier[keyof typeof PlanTier],
    defaultVisibility: typeof DefaultVisibility[keyof typeof DefaultVisibility],
    seedVersion: number,
    seededAt?: string | null,
    onboardingVersion: number,
    onboarding?: string | null,
    onboardingUpdatedAt?: string | null,
    settingsVersion: number,
    settings?: string | null,
    settingsUpdatedAt?: string | null,
    displayName?: string | null,
    email: string,
    avatarUrl?: string | null,
    lastSeenAt?: string | null,
    preferredName?: string | null,
    bio?: string | null,
    timezone?: string | null,
    locale?: string | null,
    lastDeviceId?: string | null,
    acceptedTermsAt?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};

export type OnDeleteUserProfileSubscriptionVariables = {
  filter?: ModelSubscriptionUserProfileFilterInput | null,
  owner?: string | null,
};

export type OnDeleteUserProfileSubscription = {
  onDeleteUserProfile?:  {
    __typename: "UserProfile",
    id: string,
    owner: string,
    planTier: typeof PlanTier[keyof typeof PlanTier],
    defaultVisibility: typeof DefaultVisibility[keyof typeof DefaultVisibility],
    seedVersion: number,
    seededAt?: string | null,
    onboardingVersion: number,
    onboarding?: string | null,
    onboardingUpdatedAt?: string | null,
    settingsVersion: number,
    settings?: string | null,
    settingsUpdatedAt?: string | null,
    displayName?: string | null,
    email: string,
    avatarUrl?: string | null,
    lastSeenAt?: string | null,
    preferredName?: string | null,
    bio?: string | null,
    timezone?: string | null,
    locale?: string | null,
    lastDeviceId?: string | null,
    acceptedTermsAt?: string | null,
    createdAt: string,
    updatedAt: string,
  } | null,
};
