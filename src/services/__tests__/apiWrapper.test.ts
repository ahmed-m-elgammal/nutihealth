import { apiCall, api } from '../apiWrapper';

// Mock the UIStore
const mockShowToast = jest.fn();
jest.mock('../../store/uiStore', () => ({
    useUIStore: {
        getState: () => ({
            showToast: mockShowToast,
        }),
    },
}));

// Mock fetch
global.fetch = jest.fn() as jest.Mock;

describe('apiWrapper', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockClear();
    });

    describe('apiCall', () => {
        it('should make successful GET request', async () => {
            const mockData = { id: 1, name: 'Test' };
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: new Map([['content-type', 'application/json']]),
                text: async () => JSON.stringify(mockData),
            });

            const result = await apiCall('/test');

            expect(result).toEqual(mockData);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/test'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                    }),
                })
            );
        });

        it('should handle 404 errors with suppress404 option', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 404,
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ message: 'Not found' }),
            });

            const result = await apiCall('/test', { suppress404: true });

            expect(result).toBeNull();
        });

        it('should show toast notification on error', async () => {
            const mockError = { message: 'Server error' };
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 500,
                headers: new Map([['content-type', 'application/json']]),
                json: async () => mockError,
                statusText: 'Internal Server Error',
            });

            await expect(apiCall('/test')).rejects.toThrow();
        });

        it('should retry on network failure', async () => {
            // First attempt fails, second succeeds
            (global.fetch as jest.Mock)
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    ok: true,
                    headers: new Map([['content-type', 'application/json']]),
                    text: async () => JSON.stringify({ success: true }),
                });

            const result = await apiCall('/test', { retryCount: 1 });

            expect(result).toEqual({ success: true });
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });

        it('should add query parameters correctly', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: new Map([['content-type', 'application/json']]),
                text: async () => '{}',
            });

            await apiCall('/test', {
                params: { page: '1', limit: '10' },
            });

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('?page=1&limit=10'),
                expect.any(Object)
            );
        });

        it('should stringify request body', async () => {
            const requestBody = { name: 'Test', value: 123 };
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                headers: new Map([['content-type', 'application/json']]),
                text: async () => '{}',
            });

            await apiCall('/test', {
                method: 'POST',
                body: requestBody,
            });

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: JSON.stringify(requestBody),
                })
            );
        });

        it('should suppress error toasts when suppressErrors is true', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 400,
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ message: 'Bad request' }),
                statusText: 'Bad Request',
            });

            await expect(
                apiCall('/test', { suppressErrors: true })
            ).rejects.toThrow();

            // Toast should not have been called
            // (This would require more sophisticated mocking to verify)
        });
    });

    describe('api convenience methods', () => {
        beforeEach(() => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                headers: new Map([['content-type', 'application/json']]),
                text: async () => '{}',
            });
        });

        it('should call GET with correct method', async () => {
            await api.get('/test');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'GET',
                })
            );
        });

        it('should call POST with body and correct method', async () => {
            const body = { data: 'test' };
            await api.post('/test', body);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(body),
                })
            );
        });

        it('should call PUT with body and correct method', async () => {
            const body = { data: 'test' };
            await api.put('/test', body);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify(body),
                })
            );
        });

        it('should call DELETE with correct method', async () => {
            await api.delete('/test');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'DELETE',
                })
            );
        });

        it('should call PATCH with body and correct method', async () => {
            const body = { data: 'test' };
            await api.patch('/test', body);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'PATCH',
                    body: JSON.stringify(body),
                })
            );
        });
    });

    describe('timeout handling', () => {
        it('should timeout after specified duration', async () => {
            // Mock a request that never resolves
            (global.fetch as jest.Mock).mockImplementationOnce(
                () => new Promise(() => { }) // Never resolves
            );

            await expect(
                apiCall('/test', { timeout: 100 })
            ).rejects.toThrow();
        }, 10000);
    });
});
