'use client';

import RagDocumentsManager from './RagDocumentsManager';

interface KnowledgeSourcesSectionProps {
  productId: string;
}

export default function KnowledgeSourcesSection({ productId }: KnowledgeSourcesSectionProps) {
  return <RagDocumentsManager productId={productId} />;
}
