export enum ValidationType {
    FIELD_CONDITION = 'field_condition',
    REGEX_MATCH = 'regex_match',
    CUSTOM_FUNCTION = 'custom_function',
    COMPOSITE = 'composite',
    EXTERNAL_API = 'external_api'
}

export enum ValidationOperator {
    GREATER_THAN_OR_EQUAL = '>=',
    LESS_THAN_OR_EQUAL = '<=',
    GREATER_THAN = '>',
    LESS_THAN = '<',
    EQUAL = '===',
    NOT_EQUAL = '!==',
    INCLUDES = 'includes',
    NOT_INCLUDES = 'not_includes',
    STARTS_WITH = 'starts_with',
    ENDS_WITH = 'ends_with',
    MATCHES = 'matches',
    IN = 'in',
    NOT_IN = 'not_in'
}

export enum ValidationOnFail {
    STOP = 'stop',
    CONTINUE = 'continue',
    RETRY = 'retry',
    FALLBACK = 'fallback'
}

export enum ValidationCompositeOperator {
    AND = 'and',
    OR = 'or',
    NOT = 'not'
} 