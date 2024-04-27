import sql from 'better-sqlite3';
import fs from "node:fs";
import slugify from 'slugify';
import xss from 'xss';
import { S3 } from '@aws-sdk/client-s3';


const s3 = new S3({
    region: 'us-east-1'
  });
const db = sql('meals.db');

export async function getMeals(){
    await new Promise( (resolve) => setTimeout(resolve, 2000));

    // throw new Error("Loading meals failed");
    return db.prepare('SELECT * FROM meals').all()
}

export function getMeal(slug){
    return db.prepare('SELECT * FROM meals WHERE slug = ?').get(slug);

}

export async function saveMeal(meal){
    const slug = slugify(meal.title, { lower: true});
    meal.slug = slug;
    meal.instructions = xss(meal.instructions);

    const extension = meal.image.name.split('.').pop();
    const fileName = `${meal.slug}.${extension}`;

    const bufferedImage = await meal.image.arrayBuffer();

    s3.putObject({
        Bucket: 'manoj-next-meals-app-items',
        Key: fileName,
        Body: Buffer.from(bufferedImage),
        ContentType: meal.image.type,
      });


    meal.image = fileName;

    db.prepare(`
    INSERT INTO meals
    (title, summary, instructions, creator, creator_email, image, slug)
    VALUES(
        @title,
        @summary,
        @instructions,
        @creator,
        @creator_email,
        @image,
        @slug
    )
    `).run(meal);
}