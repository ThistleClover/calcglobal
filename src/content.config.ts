import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const guidesCollection = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('CalcGlobal Editorial Team'),
    authorRole: z.string().default('Financial & Tax Specialist'),
    category: z.string(),
    country: z.enum(['fr', 'us', 'uk', 'de', 'au', 'global']),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    relatedCalculators: z.array(z.string()).default([]),
    readTime: z.string().default('5 min'),
  }),
});

export const collections = {
  guides: guidesCollection,
};
