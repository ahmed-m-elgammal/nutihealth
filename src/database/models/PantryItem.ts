import { Model, Relation } from '@nozbe/watermelondb';
import { date, field, immutableRelation, readonly } from '@nozbe/watermelondb/decorators';
import User from './User';

export default class PantryItem extends Model {
    static table = 'pantry_items';

    static associations = {
        users: { type: 'belongs_to' as const, key: 'user_id' },
    };

    @field('user_id') userId!: string;
    @immutableRelation('users', 'user_id') user!: Relation<User>;
    @field('name') name!: string;
    @field('normalized_name') normalizedName?: string;
    @field('quantity') quantity!: number;
    @field('unit') unit!: string;
    @field('category') category?: string;
    @field('expiry_date') expiryDate?: number;
    @field('is_available') isAvailable!: boolean;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
}
