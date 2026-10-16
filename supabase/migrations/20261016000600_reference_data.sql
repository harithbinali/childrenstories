-- Storyling: initial reference data. Everything here is editable from the
-- Admin Dashboard; nothing below is read from code as a constant.

insert into public.illustration_styles (slug, name_en, name_ar, description_en, description_ar, prompt_template, sort_order) values
  ('3d-cartoon', '3D Cartoon', 'كرتون ثلاثي الأبعاد',
   'Soft, rounded 3D characters with warm studio lighting.',
   'شخصيات ثلاثية الأبعاد ناعمة ومستديرة بإضاءة دافئة.',
   'Rendered as a high-quality 3D animated film character: soft rounded forms, subsurface-scattered skin, gentle warm key light, soft ambient occlusion, clean pastel-friendly palette, expressive but natural eyes.', 1),
  ('watercolor-storybook', 'Watercolor Storybook', 'ألوان مائية',
   'Hand-painted watercolor washes like a classic picture book.',
   'رسومات بالألوان المائية مثل كتب الأطفال الكلاسيكية.',
   'Painted in traditional watercolor picture-book style: translucent layered washes, soft paper texture, delicate ink linework, gentle bleeding edges, warm natural palette.', 2),
  ('2d-cartoon', '2D Cartoon', 'كرتون ثنائي الأبعاد',
   'Bold, clean 2D cartoon with bright flat colors.',
   'رسوم كرتونية ثنائية الأبعاد بألوان زاهية.',
   'Drawn as a clean modern 2D cartoon: confident outlines, flat bright colors with simple cel shading, friendly proportions, crisp shapes.', 3),
  ('magical-fairytale', 'Magical Fairytale', 'حكاية خيالية ساحرة',
   'Dreamy, luminous fairytale painting with sparkles and glow.',
   'لوحة خيالية حالمة مضيئة مع لمعان وبريق.',
   'Painted as a dreamy luminous fairytale illustration: soft glowing light, gentle sparkles, rich jewel tones, painterly textures, enchanting atmosphere.', 4)
on conflict (slug) do nothing;

insert into public.story_themes (slug, name_en, name_ar, prompt_guidance, is_custom, is_featured, sort_order) values
  ('magical-adventure',   'Magical Adventure',   'مغامرة سحرية',     'A journey through a magical land with gentle wonder and a satisfying discovery.', false, true, 1),
  ('space-adventure',     'Space Adventure',     'مغامرة في الفضاء', 'A friendly trip among stars and planets; curiosity and teamwork.', false, true, 2),
  ('underwater-adventure','Underwater Adventure','مغامرة تحت الماء', 'Exploring a colourful ocean with kind sea creatures.', false, true, 3),
  ('dinosaur-world',      'Dinosaur World',      'عالم الديناصورات', 'Meeting friendly dinosaurs; nothing frightening or violent.', false, true, 4),
  ('enchanted-forest',    'Enchanted Forest',    'الغابة المسحورة',  'A gentle forest of talking animals, glowing plants and small mysteries.', false, false, 5),
  ('superhero-adventure', 'Superhero Adventure', 'مغامرة بطل خارق',  'The child discovers a kind superpower and helps others; no violence.', false, true, 6),
  ('animal-friends',      'Animal Friends',      'أصدقاء الحيوانات', 'Friendship and care for animals.', false, false, 7),
  ('bedtime',             'Bedtime',             'قصة قبل النوم',    'Calm, slow, soothing; ends with the child falling peacefully asleep.', false, false, 8),
  ('birthday',            'Birthday',            'عيد الميلاد',      'A celebratory birthday adventure with surprises and friends.', false, false, 9),
  ('friendship',          'Friendship',          'الصداقة',          'Making and keeping friends, sharing and empathy.', false, false, 10),
  ('kindness',            'Kindness',            'اللطف',            'Small acts of kindness make a big difference.', false, false, 11),
  ('courage',             'Courage',             'الشجاعة',          'Facing a gentle, age-appropriate fear and growing braver.', false, false, 12),
  ('learning',            'Learning',            'التعلّم',          'Curiosity and learning something new in a playful way.', false, false, 13),
  ('custom',              'Custom Story',        'قصة مخصّصة',       'Follow the parent''s idea closely while keeping it age-appropriate.', true, false, 14)
on conflict (slug) do nothing;

-- PLACEHOLDER PRICES: confirm and edit in Admin > Products and Pricing before launch.
insert into public.book_products (sku, name_en, name_ar, page_count, price_amount, currency, free_preview_pages, included_regenerations, sort_order) values
  ('book-8-usd',  '8-page storybook',  'كتاب من 8 صفحات',  8,  1900, 'USD', 2, 8,  1),
  ('book-12-usd', '12-page storybook', 'كتاب من 12 صفحة', 12, 2400, 'USD', 2, 12, 2),
  ('book-16-usd', '16-page storybook', 'كتاب من 16 صفحة', 16, 2900, 'USD', 2, 16, 3)
on conflict (sku) do nothing;

-- Model ids are configurable. pricing is left empty on purpose: admins enter
-- current OpenAI prices; until then cost estimates are recorded as unknown.
insert into public.ai_model_settings (purpose, model, params, timeout_ms, max_retries) values
  ('story',      'gpt-5.5',                '{"reasoning_effort":"medium"}', 180000, 2),
  ('story_fast', 'gpt-5.4-mini',           '{}', 60000, 2),
  ('image',      'gpt-image-2',            '{"preview_quality":"medium","final_quality":"high","output_format":"png"}', 300000, 2),
  ('moderation', 'omni-moderation-latest', '{}', 30000, 2)
on conflict (purpose) do nothing;

insert into public.payment_gateway_configs (gateway, is_enabled, is_default, mode, supported_currencies) values
  ('stripe', false, true,  'sandbox', '{USD}'),
  ('paypal', false, false, 'sandbox', '{USD}')
on conflict (gateway) do nothing;

insert into public.platform_settings (key, value, is_public) values
  ('brand.name',                              '"Storyling"', true),
  ('brand.support_email',                     '"support@example.com"', true),
  ('limits.free_character_attempts',          '3',    false),
  ('limits.free_story_attempts',              '3',    false),
  ('limits.free_illustration_previews',       '2',    false),
  ('limits.daily_image_generations_per_user', '30',   false),
  ('limits.daily_text_generations_per_user',  '40',   false),
  ('limits.max_concurrent_jobs_per_user',     '4',    false),
  ('limits.daily_platform_spend_usd',         '100',  false),
  ('limits.worker_concurrency',               '3',    false),
  ('retention.child_photo_days',              '30',   false),
  ('features.google_auth',                    'false', true),
  ('features.design_system_public',           'false', false)
on conflict (key) do nothing;
