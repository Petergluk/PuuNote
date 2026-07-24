import { DEFAULT_SYSTEM_PROMPT, DEFAULT_ARCHITECT_PROMPT } from './prompts';


export const getSysPrompt = () => localStorage.getItem('puucoach_sys_prompt') || DEFAULT_SYSTEM_PROMPT;
export const getArchPrompt = () => localStorage.getItem('puucoach_arch_prompt') || DEFAULT_ARCHITECT_PROMPT;
export const getArchitectFrequency = () => parseInt(localStorage.getItem('puucoach_arch_freq') || '2', 10);
export const getArchitectContext = () => parseInt(localStorage.getItem('puucoach_arch_context') || '10', 10);
export const getMaxCards = () => parseInt(localStorage.getItem('puucoach_max_cards') || '0', 10);
export const getCoachModel = () => localStorage.getItem('puucoach_coach_model') || '';
export const getArchModel = () => localStorage.getItem('puucoach_arch_model') || '';
