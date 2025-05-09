export enum TaskType {
    API_CALL = 'api_call',
    DATABASE_QUERY = 'database_query',
    EMAIL_SEND = 'email_send',
    FILE_OPERATION = 'file_operation',
    CUSTOM_FUNCTION = 'custom_function',
    WEBHOOK = 'webhook',
    CONDITIONAL = 'conditional'
}

export enum TaskMethod {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE',
    PATCH = 'PATCH'
}

export enum TaskStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed',
    RETRYING = 'retrying',
    CANCELLED = 'cancelled'
}

export enum TaskPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

export enum TaskRetryStrategy {
    IMMEDIATE = 'immediate',
    LINEAR = 'linear',
    EXPONENTIAL = 'exponential',
    CUSTOM = 'custom'
} 