
import { StudentScores, CourseConfig, GradingConfig } from '../types';

// Calculates the WEIGHTED score for final grade calculation.
export const calculateTotal = (studentScores: StudentScores['scores'] | undefined | null, config: CourseConfig | null): number => {
    if (!studentScores || !config) return 0;
    
    const { gradingConfig, gradingConfigOrder } = config;
    if (!gradingConfig || !gradingConfigOrder) return 0;
    
    let totalScore = 0;
    gradingConfigOrder.forEach(key => {
        const component = gradingConfig[key];
        if (!component) return;
        
        const hasSubComponents = component.subComponents && component.subComponentsOrder && component.subComponentsOrder.length > 0;
        
        if (hasSubComponents) {
            let rawStudentScore = 0;
            let rawMaxScore = 0;
            
            const getRawScores = (subConfig: GradingConfig, subOrder: string[], parentKey: string) => {
                subOrder.forEach(subKey => {
                    const subComponent = subConfig[subKey];
                    if (!subComponent) return;
                    const fullKey = `${parentKey}.${subKey}`;
                    if (subComponent.subComponents && subComponent.subComponentsOrder && subComponent.subComponentsOrder.length > 0) {
                        getRawScores(subComponent.subComponents, subComponent.subComponentsOrder, fullKey);
                    } else {
                        rawStudentScore += Number(studentScores[fullKey]) || 0;
                        rawMaxScore += Number(subComponent.max) || 0;
                    }
                });
            };
            
            getRawScores(component.subComponents!, component.subComponentsOrder!, key);
            
            if (rawMaxScore > 0) {
                const scaledScore = (rawStudentScore / rawMaxScore) * (Number(component.max) || 0);
                totalScore += scaledScore;
            }
        } else {
            totalScore += Number(studentScores[key]) || 0;
        }
    });
    return totalScore;
};

// New Helper: Calculate score for a specific group/category
export const calculateGroupScore = (
    studentScores: StudentScores['scores'] | undefined | null, 
    component: any, // GradingComponent from config
    parentKey: string
): number => {
    if (!studentScores || !component) return 0;
    
    // If it's a leaf, return direct value
    if (!component.subComponents || !component.subComponentsOrder || component.subComponentsOrder.length === 0) {
        return Number(studentScores[parentKey]) || 0;
    }

    // It's a group, calculate scaled total
    let rawStudentScore = 0;
    let rawMaxScore = 0;

    const getRawScores = (subConfig: any, subOrder: string[], pKey: string) => {
        subOrder.forEach(subKey => {
            const subComponent = subConfig[subKey];
            const fullKey = `${pKey}.${subKey}`;
            if (subComponent.subComponents && subComponent.subComponentsOrder?.length > 0) {
                 getRawScores(subComponent.subComponents, subComponent.subComponentsOrder, fullKey);
            } else {
                rawStudentScore += Number(studentScores[fullKey]) || 0;
                rawMaxScore += Number(subComponent.max) || 0;
            }
        });
    };

    getRawScores(component.subComponents, component.subComponentsOrder, parentKey);

    if (rawMaxScore > 0) {
        return (rawStudentScore / rawMaxScore) * (Number(component.max) || 0);
    }
    return 0;
};

export const calculateGrade = (totalScore: number): number => {
    if (totalScore >= 80) return 4;
    if (totalScore >= 75) return 3.5;
    if (totalScore >= 70) return 3;
    if (totalScore >= 65) return 2.5;
    if (totalScore >= 60) return 2;
    if (totalScore >= 55) return 1.5;
    if (totalScore >= 50) return 1;
    return 0;
};

export interface FlatGradingItem {
    key: string;
    label: string;
    max?: number;
    isHeader: boolean;
    level: number;
}

export const flattenGradingConfig = (config: GradingConfig, order: string[]): FlatGradingItem[] => {
    const items: FlatGradingItem[] = [];
    
    const flatten = (cfg: GradingConfig, ord: string[], path: string, level: number) => {
        ord.forEach(key => {
            const component = cfg[key];
            if (!component) return;
            const fullKey = path ? `${path}.${key}` : key;
            const hasSub = component.subComponents && component.subComponentsOrder && component.subComponentsOrder.length > 0;

            if (hasSub) {
                items.push({ 
                    key: fullKey, 
                    label: component.label, 
                    isHeader: true, 
                    level: level,
                    max: component.max
                });
                flatten(component.subComponents!, component.subComponentsOrder!, fullKey, level + 1);
            } else {
                items.push({ 
                    key: fullKey, 
                    label: component.label, 
                    isHeader: false, 
                    level: level,
                    max: component.max
                });
            }
        });
    };

    flatten(config, order, "", 0);
    return items;
};

export interface DisplayColumn {
    key: string;
    label: string;
    max: number;
    isGroupTotal?: boolean;
    isLeaf?: boolean;
}

// Generates columns for the table, inserting "Total [Group]" columns after groups
export const getDisplayColumnsWithGroups = (config: GradingConfig, order: string[]): DisplayColumn[] => {
    const columns: DisplayColumn[] = [];

    const process = (cfg: GradingConfig, ord: string[], parentKey: string) => {
        ord.forEach(key => {
            const component = cfg[key];
            const fullKey = parentKey ? `${parentKey}.${key}` : key;
            const hasSub = component.subComponents && component.subComponentsOrder && component.subComponentsOrder.length > 0;

            if (hasSub) {
                // Recursively add children first (flattened)
                process(component.subComponents!, component.subComponentsOrder!, fullKey);
                
                // Then add the Group Total column
                columns.push({
                    key: `GROUP_TOTAL::${fullKey}`, // Special marker key
                    label: `รวม ${component.label}`,
                    max: Number(component.max),
                    isGroupTotal: true,
                    isLeaf: false
                });
            } else {
                // Add Leaf
                columns.push({
                    key: fullKey,
                    label: component.label,
                    max: Number(component.max),
                    isLeaf: true,
                    isGroupTotal: false
                });
            }
        });
    };

    process(config, order, "");
    return columns;
};
