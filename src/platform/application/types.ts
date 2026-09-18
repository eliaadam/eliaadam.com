
export type ApplicationCode =
    | 'main'
    | 'docs'
    | 'business';

export interface ApplicationDefinition {
    readonly code: ApplicationCode;
    readonly hostname: string;
    readonly name: string;
    readonly description?: string;
    readonly enabled: boolean;
}

export interface ResolvedApplication {
    readonly definition: ApplicationDefinition;
    readonly hostname: string;
}

