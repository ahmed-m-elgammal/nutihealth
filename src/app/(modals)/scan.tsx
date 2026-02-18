import React from 'react';
import BarcodeScannerScreen from './barcode-scanner';

/**
 * Legacy route kept for backward compatibility.
 * Delegates to the newer barcode-scanner implementation.
 */
export default function ScanScreen() {
    return <BarcodeScannerScreen />;
}
