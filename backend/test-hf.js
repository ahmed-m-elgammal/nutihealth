const { HfInference } = require('@huggingface/inference');
const { Buffer } = require('node:buffer');
require('dotenv').config({ path: './.env' });

async function test() {
    try {
        const hf = new HfInference(process.env.HF_API_TOKEN);
        const model = process.env.HF_FOOD_MODEL || 'google/vit-base-patch16-224-in21k-finetuned-food101';
        const base64Data =
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
        const buffer = Buffer.from(base64Data, 'base64');
        const response = await hf.imageClassification({
            model,
            data: buffer,
        });
        console.log('Success! Response:');
        console.log(response);
    } catch (error) {
        require('fs').writeFileSync(
            'hf-error.json',
            JSON.stringify(
                {
                    message: error.message,
                    stack: error.stack,
                    ...error,
                },
                null,
                2,
            ),
        );
        console.error('Wrote error to hf-error.json');
    }
}

test();
