import fs from 'fs';

const fixFile = (file) => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/<ReactMarkdown[^>]*>[\s\S]*?<\/ReactMarkdown>/g, (match) => {
    let inner = '';
    if (match.includes("node.content")) inner = "node.content || '*Empty node...*'";
    else if (match.includes("Empty card")) inner = "n.content || '*Empty card...*'";
    else if (match.includes("Empty node")) inner = "n.content || '*Empty node...*'";
    else return match;

    return `<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{${inner}}</ReactMarkdown>`;
  });
  fs.writeFileSync(file, content);
};

['src/components/Card.tsx', 'src/components/TimelineView.tsx', 'src/components/FullScreenModal.tsx'].forEach(fixFile);
console.log('Fixed ReactMarkdown children.');
