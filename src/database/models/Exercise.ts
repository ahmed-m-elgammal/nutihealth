import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export default class Exercise extends Model {
    static table = 'exercises';

    @field('name') name!: string;
    @field('category') category!: string;
    @field('muscle_group') muscleGroup!: string;
    @field('equipment') equipment!: string;
    @field('description') description?: string;
    @field('video_url') videoUrl?: string;
    @field('image_url') imageUrl?: string;
    @field('is_custom') isCustom!: boolean;
    @field('user_id') userId?: string;
    @readonly @date('created_at') createdAt!: Date;
    @readonly @date('updated_at') updatedAt!: Date;
}
