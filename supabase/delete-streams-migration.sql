-- Allow sellers to delete their own streams
CREATE POLICY "Sellers delete own streams" ON public.streams FOR DELETE USING (auth.uid() = seller_id);

-- Allow sellers to delete their own items
CREATE POLICY "Sellers delete own items" ON public.items FOR DELETE USING (auth.uid() = seller_id);
