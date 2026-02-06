import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
    migrations: [
        // Future migrations will go here
        // Example:
        // {
        //   toVersion: 2,
        //   steps: [
        //     addColumns({
        //       table: 'users',
        //       columns: [
        //         { name: 'new_field', type: 'string', isOptional: true },
        //       ],
        //     }),
        //   ],
        // },
    ],
});
