
import { APPLICATIONS } from '../../config/applications';
import type {
    ApplicationDefinition,
    ResolvedApplication,
} from './types';

const normalizeHostname = (hostname: string): string => {
    return hostname
        .trim()
        .toLowerCase()
        .replace(/\.$/, '');
};

export const resolveApplication = (
    hostname: string = window.location.hostname,
): ResolvedApplication => {
    const normalizedHostname = normalizeHostname(hostname);

    const definition: ApplicationDefinition | undefined =
        APPLICATIONS.find(
            (application) =>
                application.hostname === normalizedHostname &&
                application.enabled,
        );

    if (!definition) {
        throw new Error(
            `Unsupported application hostname: ${normalizedHostname}`,
        );
    }

    return {
        definition,
        hostname: normalizedHostname,
    };
};

