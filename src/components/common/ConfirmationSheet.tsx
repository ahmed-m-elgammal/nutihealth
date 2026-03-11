import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

type Props = {
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    destructive?: boolean;
};

export default function ConfirmationSheet({
    visible,
    title,
    message,
    confirmLabel,
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    destructive = true,
}: Props) {
    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
            <Pressable
                onPress={onCancel}
                style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' }}
            >
                <Pressable
                    onPress={() => undefined}
                    style={{
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        backgroundColor: '#fff',
                        paddingHorizontal: 20,
                        paddingTop: 20,
                        paddingBottom: 28,
                    }}
                >
                    <View style={{ alignItems: 'center' }}>
                        <View
                            style={{
                                height: 4,
                                width: 48,
                                borderRadius: 999,
                                backgroundColor: '#cbd5e1',
                                marginBottom: 14,
                            }}
                        />
                    </View>
                    <Text style={{ color: '#0f172a', fontWeight: '800', fontSize: 18 }}>{title}</Text>
                    <Text style={{ color: '#475569', marginTop: 8, lineHeight: 20 }}>{message}</Text>

                    <View style={{ marginTop: 18, gap: 10 }}>
                        <Pressable
                            onPress={onConfirm}
                            style={{
                                borderRadius: 12,
                                paddingVertical: 12,
                                alignItems: 'center',
                                backgroundColor: destructive ? '#dc2626' : '#0ea5e9',
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '700' }}>{confirmLabel}</Text>
                        </Pressable>
                        <Pressable
                            onPress={onCancel}
                            style={{
                                borderRadius: 12,
                                paddingVertical: 12,
                                alignItems: 'center',
                                borderWidth: 1,
                                borderColor: '#cbd5e1',
                            }}
                        >
                            <Text style={{ color: '#334155', fontWeight: '700' }}>{cancelLabel}</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
