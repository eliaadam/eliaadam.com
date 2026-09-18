
import type { ApplicationDefinition } from '../platform/application/types';

export const APPLICATIONS: readonly ApplicationDefinition[] = [
    {
        code: 'main',
        hostname: 'sonicpesa.com',
        name: 'SonicPesa',
        description: 'SonicPesa main application',
        enabled: true,
    },

    {
        code: 'docs',
        hostname: 'docs.sonicpesa.com',
        name: 'SonicPesa Documentation',
        description: 'SonicPesa documentation',
        enabled: true,
    },

    {
        code: 'business',
        hostname: 'business.sonicpesa.com',
        name: 'SonicPesa Business',
        description: 'SonicPesa business application',
        enabled: true,
    },
];

