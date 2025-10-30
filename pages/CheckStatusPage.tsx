import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Course, GradingConfig, GradingComponent } from '../types';
import { getCourseGradingConfig, setCourseGradingConfig } from '../services/googleSheetService';
import LoadingSpinner from '../components/LoadingSpinner';
// @ts-ignore
import Swal from 'sweetalert2';
import { produce } from 'https://esm.sh/immer@10.1.1';

interface GradingConfigProps {
    courseName: Course;
    onBack: () => void;
}

const FIXED_KEYS = ['psychomotor', 'midterm', 'final'];

// --- HELPER FUNCTIONS & SUB-COMPONENTS ---

// Recursively calculates the raw maximum points for a component (sums up all leaf nodes).
const calculateRawMaxPoints = (component?: GradingComponent): number => {
    if (!component) return 0;
    const hasSub = component.subComponents && component.subComponentsOrder && component.subComponentsOrder.length > 0;
    if (hasSub) {
        return component.subComponentsOrder!.reduce((sum, key) => {
            return sum + calculateRawMaxPoints(component.subComponents![key]);
        }, 0);
    }
    return Number(component.max) || 0;
};

const commonInputClass = "p-2 bg-white border border-slate-300 rounded-md text-sm w-full focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-shadow";

// Recursive editor for any level of the grading tree
const RecursiveEditor: React.FC<{
    config: GradingConfig;
    order: string[];
    path: string[];
    component: GradingComponent;
    onUpdate: (path: string[], newComponent: Partial<GradingComponent>) => void;
    onAdd: (path: string[]) => void;
    onRemove: (path: string[], key: string) => void;
    onMove: (path: string[], index: number, direction: 'up' | 'down') => void;
    setEditingPath: (path: string[]) => void;
}> = ({ config, order, path, component, onUpdate, onAdd, onRemove, onMove, setEditingPath }) => {

    const subComponents = component.subComponents || {};
    const subOrder = component.subComponentsOrder || [];
    const totalSubPoints = useMemo(() => calculateRawMaxPoints(component), [component]);

    const getLabelForPath = (currentPath: string[]): string => {
        if (!config || currentPath.length === 0) return '';
        let current: GradingComponent | undefined = config[currentPath[0]];
        for (let i = 1; i < currentPath.length; i++) {
            if (!current?.subComponents) return '';
            current = current.subComponents[currentPath[i]];
        }
        return current?.label || '';
    };

    return (
        <div className="animate-fade-in">
             <nav className="flex items-center text-sm font-medium text-slate-600 mb-4 flex-wrap">
                <button onClick={() => setEditingPath([])} className="hover:text-orange-600 transition-colors">ภาพรวม</button>
                {path.map((key, index) => {
                    const currentPath = path.slice(0, index + 1);
                    return (
                        <React.Fragment key={key}>
                            <span className="mx-2 text-slate-400">/</span>
                            <button onClick={() => setEditingPath(currentPath)} className="hover:text-orange-600 transition-colors">
                                {getLabelForPath(currentPath)}
                            </button>
                        </React.Fragment>
                    );
                })}
            </nav>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
                    <h3 className="text-xl font-bold text-slate-800">จัดการหัวข้อย่อย: <span className="text-orange-600">{component.label}</span></h3>
                    <div className="text-right">
                        <p className="font-semibold text-slate-700">คะแนนหัวข้อหลัก (น้ำหนัก): <span className="text-orange-500">{component.max}</span></p>
                        <p className="text-sm text-slate-500">คะแนนดิบรวมจากข้อย่อย: {totalSubPoints}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {subOrder.length > 0 ? (
                        subOrder.map((subKey, index) => {
                             const subComponent = subComponents[subKey];
                             if(!subComponent) return null;
                             const hasSubSub = subComponent.subComponents && subComponent.subComponentsOrder && subComponent.subComponentsOrder.length > 0;
                            return(
                                <div key={subKey} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                                    <div className="flex flex-col">
                                        <button type="button" onClick={() => onMove(path, index, 'up')} disabled={index === 0} className="p-1 text-slate-400 hover:text-slate-700 disabled:text-slate-200"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg></button>
                                        <button type="button" onClick={() => onMove(path, index, 'down')} disabled={index === subOrder.length - 1} className="p-1 text-slate-400 hover:text-slate-700 disabled:text-slate-200"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg></button>
                                    </div>
                                    <input type="text" placeholder="ชื่อหัวข้อย่อย" value={subComponent.label || ''} onChange={e => onUpdate([...path, subKey], { label: e.target.value })} className={`${commonInputClass} flex-grow`}/>
                                    <input type="number" value={subComponent.max || ''} onChange={e => onUpdate([...path, subKey], { max: parseInt(e.target.value) || 0 })} className={`${commonInputClass} w-24 text-center`} min="0"/>
                                    <button type="button" onClick={() => setEditingPath([...path, subKey])} className="px-2 py-1.5 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-md whitespace-nowrap">
                                        {hasSubSub ? 'จัดการ' : 'เพิ่ม'}
                                    </button>
                                    <button type="button" onClick={() => onRemove(path, subKey)} className="text-red-500 hover:text-red-700 p-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg></button>
                                </div>
                            )
                        })
                    ) : (
                        <p className="text-center text-slate-500 py-4">ยังไม่มีหัวข้อย่อย คลิกปุ่มด้านล่างเพื่อเพิ่ม</p>
                    )}
                </div>
                <div className="mt-4">
                    <button type="button" onClick={() => onAdd(path)} className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                        เพิ่มหัวข้อย่อย
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- MAIN COMPONENT ---

const GradingConfig: React.FC<GradingConfigProps> = ({ courseName, onBack }) => {
    const [config, setConfig] = useState<GradingConfig | null>(null);
    const [order, setOrder] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingPath, setEditingPath] = useState<string[]>([]);

    const fetchConfig = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await getCourseGradingConfig(courseName);
            if (res.success && res.data) {
                const sanitizedConfig = produce(res.data.gradingConfig, draft => {
                    if (!draft.psychomotor) draft.psychomotor = { label: 'จิตพิสัย', max: 20 };
                    if (!draft.midterm) draft.midterm = { label: 'กลางภาค', max: 40 };
                    if (!draft.final) draft.final = { label: 'ปลายภาค', max: 40 };
                });
                setConfig(sanitizedConfig);

                let currentOrder = res.data.gradingConfigOrder?.length ? [...res.data.gradingConfigOrder] : Object.keys(sanitizedConfig);
                const configKeys = new Set(Object.keys(sanitizedConfig));
                currentOrder = currentOrder.filter(key => configKeys.has(key));
                Object.keys(sanitizedConfig).forEach(key => {
                    if (!currentOrder.includes(key)) currentOrder.push(key);
                });
                const fixed = FIXED_KEYS.filter(k => currentOrder.includes(k));
                const others = currentOrder.filter(k => !FIXED_KEYS.includes(k));
                setOrder([...fixed, ...others]);

            } else {
                throw new Error(res.message || 'Failed to load configuration.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [courseName]);

    useEffect(() => { fetchConfig(); }, [fetchConfig]);

    const handleUpdate = useCallback((path: string[], newComponentData: Partial<GradingComponent>) => {
        setConfig(prevConfig => prevConfig ? produce(prevConfig, draft => {
            let currentLevel: any = draft;
            path.slice(0, -1).forEach(p => {
                currentLevel = currentLevel[p].subComponents;
            });
            Object.assign(currentLevel[path.slice(-1)[0]], newComponentData);
        }) : null);
    }, []);

    const handleAdd = useCallback((path: string[]) => {
        setConfig(prevConfig => prevConfig ? produce(prevConfig, draft => {
            const newKey = `custom_${Date.now()}`;
            const newComponent: GradingComponent = { label: '', max: 10 };
            if (path.length === 0) {
                draft[newKey] = newComponent;
                setOrder(prev => [...prev, newKey]);
            } else {
                let parent: GradingComponent = draft[path[0]]!;
                for (let i = 1; i < path.length; i++) {
                    parent = parent.subComponents![path[i]]!;
                }
                if (!parent.subComponents) parent.subComponents = {};
                if (!parent.subComponentsOrder) parent.subComponentsOrder = [];
                parent.subComponents[newKey] = newComponent;
                parent.subComponentsOrder.push(newKey);
            }
        }) : null);
    }, []);

    const handleRemove = useCallback((path: string[], key: string) => {
        setConfig(prevConfig => prevConfig ? produce(prevConfig, draft => {
            if (path.length === 0) {
                delete draft[key];
                setOrder(prev => prev.filter(k => k !== key));
            } else {
                let parent: GradingComponent = draft[path[0]]!;
                 for (let i = 1; i < path.length; i++) {
                    parent = parent.subComponents![path[i]]!;
                }
                delete parent.subComponents![key];
                parent.subComponentsOrder = parent.subComponentsOrder!.filter(k => k !== key);
            }
        }) : null);
    }, []);
    
    const handleMove = useCallback((path: string[], index: number, direction: 'up' | 'down') => {
        const toIndex = direction === 'up' ? index - 1 : index + 1;
        const updateOrder = (arr: string[]) => {
            if (toIndex < 0 || toIndex >= arr.length) return arr;
            const newOrder = [...arr];
            const [item] = newOrder.splice(index, 1);
            newOrder.splice(toIndex, 0, item);
            return newOrder;
        };

        if (path.length === 0) {
            setOrder(prev => updateOrder(prev));
        } else {
            setConfig(prev => prev ? produce(prev, draft => {
                let parent = draft[path[0]]!;
                 for (let i = 1; i < path.length; i++) {
                    parent = parent.subComponents![path[i]]!;
                }
                parent.subComponentsOrder = updateOrder(parent.subComponentsOrder!);
            }) : null);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!config || !order) return;
        
        const hasEmptyLabel = (c: GradingConfig): boolean => Object.values(c).some(comp => 
            comp.label.trim() === '' || (comp.subComponents ? hasEmptyLabel(comp.subComponents) : false)
        );

        if (hasEmptyLabel(config)) {
            Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกชื่อหัวข้อคะแนนให้ครบทุกช่อง', 'warning');
            return;
        }

        Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const res = await setCourseGradingConfig(courseName, { gradingConfig: config, gradingConfigOrder: order });
        if (res.success) {
            Swal.fire('สำเร็จ!', 'บันทึกการตั้งค่าคะแนนเรียบร้อยแล้ว', 'success');
        } else {
            Swal.fire('เกิดข้อผิดพลาด', res.message || 'ไม่สามารถบันทึกได้', 'error');
        }
    };
    
    const totalWeightedScore = useMemo(() => {
        if (!config || !order) return 0;
        return order.reduce((sum, key) => sum + (Number(config[key]?.max) || 0), 0);
    }, [config, order]);

    const totalRawMaxScore = useMemo(() => {
        if (!config || !order) return 0;
        return order.reduce((sum, key) => {
            return sum + calculateRawMaxPoints(config[key]);
        }, 0);
    }, [config, order]);


    const editingComponent = useMemo(() => {
        if (!config || editingPath.length === 0) return null;
        let current = config[editingPath[0]];
        if (!current) return null;
        for (let i = 1; i < editingPath.length; i++) {
            if (!current.subComponents) return null;
            current = current.subComponents[editingPath[i]];
            if (!current) return null;
        }
        return current;
    }, [config, editingPath]);

    if (isLoading) return <div className="text-center py-10"><LoadingSpinner size="lg" /></div>;
    if (error) return <div className="text-center text-red-600 p-4 bg-red-50 rounded-lg">{error}</div>;
    if (!config) return <div className="text-center text-slate-500">No configuration found.</div>;

    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
            {editingPath.length > 0 && editingComponent ? (
                <RecursiveEditor
                    config={config}
                    order={order}
                    path={editingPath}
                    component={editingComponent}
                    setEditingPath={setEditingPath}
                    onUpdate={handleUpdate}
                    onAdd={handleAdd}
                    onRemove={handleRemove}
                    onMove={handleMove}
                />
            ) : (
                <form onSubmit={handleSubmit} className="animate-fade-in">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                        <button onClick={onBack} className="flex items-center text-sm font-medium text-slate-600 hover:text-orange-600 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            กลับไปที่ตารางคะแนน
                        </button>
                        <h2 className="text-xl sm:text-2xl font-bold text-orange-600 text-left sm:text-right">ตั้งค่าคะแนน - {courseName}</h2>
                    </div>

                    <div className="space-y-4">
                        {order.map((key, index) => {
                            const component = config[key];
                            if (!component) return null;
                            const isFixed = FIXED_KEYS.includes(key);
                            const hasSub = component.subComponents && component.subComponentsOrder && component.subComponentsOrder.length > 0;
                            
                            return (
                                <div key={key} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
                                    <div className="flex flex-row sm:flex-col self-start sm:self-center">
                                        <button type="button" onClick={() => handleMove([], index, 'up')} disabled={index === 0} className="p-1 text-slate-400 hover:text-slate-700 disabled:text-slate-200"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg></button>
                                        <button type="button" onClick={() => handleMove([], index, 'down')} disabled={index === order.length - 1} className="p-1 text-slate-400 hover:text-slate-700 disabled:text-slate-200"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg></button>
                                    </div>
                                    <div className="flex-grow w-full">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input type="text" placeholder="ชื่อหัวข้อหลัก" value={component.label} onChange={e => handleUpdate([key], { label: e.target.value })} disabled={isFixed} className={`${commonInputClass} ${isFixed ? 'bg-slate-200' : ''}`} />
                                            <div className="relative">
                                                <input type="number" value={component.max} onChange={e => handleUpdate([key], { max: parseInt(e.target.value) || 0 })} className={`${commonInputClass} pr-16`} min="0" />
                                                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-slate-500">คะแนน</span>
                                            </div>
                                        </div>
                                        {hasSub && <p className="text-xs text-slate-500 mt-2">มี {component.subComponentsOrder!.length} หัวข้อย่อย (รวม {calculateRawMaxPoints(component)} คะแนนดิบ)</p>}
                                    </div>
                                    <div className="flex items-center space-x-2 self-start sm:self-center">
                                        <button type="button" onClick={() => setEditingPath([key])} className="px-3 py-2 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-md whitespace-nowrap">
                                            จัดการหัวข้อย่อย
                                        </button>
                                        {!isFixed && (
                                            <button type="button" onClick={() => handleRemove([], key)} className="text-slate-400 hover:text-red-500 p-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className="mt-6">
                        <button type="button" onClick={() => handleAdd([])} className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                            เพิ่มหัวข้อคะแนนหลัก
                        </button>
                    </div>

                    <div className="text-right pt-6 mt-6 border-t-2 border-slate-200">
                        <div className="flex flex-col items-end">
                            <div className="flex items-center">
                                <p className="font-bold text-lg text-slate-800">
                                    คะแนนรวม (แบบถ่วงน้ำหนัก):
                                </p>
                                <span className={`text-2xl font-bold ml-2 ${totalWeightedScore === 100 ? 'text-green-600' : 'text-orange-600'}`}>
                                    {totalWeightedScore}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                (ผลรวมของหัวข้อหลัก ควรเป็น 100 สำหรับการคำนวณเกรด)
                            </p>

                            <div className="flex items-center mt-3">
                                <p className="font-semibold text-md text-slate-700">
                                    คะแนนดิบรวมทั้งหมด:
                                </p>
                                <span className="text-xl font-bold ml-2 text-blue-600">
                                    {totalRawMaxScore}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                (ผลรวมของคะแนนเต็มในทุกหัวข้อย่อย)
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button type="submit" className="px-6 py-2.5 font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-md transition-all duration-300">
                            บันทึกการตั้งค่า
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default GradingConfig;