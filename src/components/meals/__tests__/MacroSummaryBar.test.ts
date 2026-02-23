import { calculateMacroProgress } from '../MacroSummaryBar';

describe('calculateMacroProgress', () => {
    it('returns zero progress when goal is missing', () => {
        expect(calculateMacroProgress(20, 0)).toEqual({
            consumed: 20,
            goal: 0,
            ratio: 0,
            barPercent: 0,
        });
    });

    it('computes ratio and bar fill for valid goals', () => {
        expect(calculateMacroProgress(30, 60)).toEqual({
            consumed: 30,
            goal: 60,
            ratio: 0.5,
            barPercent: 50,
        });
    });

    it('caps bar fill at 100% but keeps over-goal ratio', () => {
        expect(calculateMacroProgress(150, 100)).toEqual({
            consumed: 150,
            goal: 100,
            ratio: 1.5,
            barPercent: 100,
        });
    });
});
