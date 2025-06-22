import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProjectionStore } from '@/store/projectionStore';
import type { Layer } from '@/types/store';

interface CodeEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layerId?: string;
  layerType?: 'shader' | 'html';
}

const DEFAULT_SHADER_CODE = `// GLSL Fragment Shader
#version 300 es
precision highp float;

uniform float time;
uniform vec2 resolution;
uniform sampler2D texture0;

in vec2 vTexCoord;
out vec4 fragColor;

void main() {
    vec2 uv = vTexCoord;
    
    // Simple wave effect
    uv.x += sin(uv.y * 10.0 + time) * 0.05;
    
    vec4 color = texture(texture0, uv);
    fragColor = color;
}`;

const DEFAULT_HTML_CODE = `<!-- HTML Layer -->
<div style="
    position: absolute;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    font-family: Arial, sans-serif;
">
    <h1>HTML Content Layer</h1>
</div>`;

export function CodeEditor({
  open,
  onOpenChange,
  layerId,
  layerType,
}: CodeEditorProps) {
  const { layers, updateLayer, addLayer } = useProjectionStore();
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<'glsl' | 'html'>('glsl');
  const [editorTheme, setEditorTheme] = useState('vs-dark');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Load layer data when dialog opens
  useEffect(() => {
    if (open && layerId && layers[layerId]) {
      const layer = layers[layerId];
      if (layer.type === 'shader' && layer.shaderCode) {
        setCode(layer.shaderCode);
        setLanguage('glsl');
      } else if (layer.type === 'html' && layer.htmlCode) {
        setCode(layer.htmlCode);
        setLanguage('html');
      }
    } else if (open && !layerId) {
      // Creating new layer
      setIsCreatingNew(true);
      if (layerType === 'shader') {
        setCode(DEFAULT_SHADER_CODE);
        setLanguage('glsl');
      } else if (layerType === 'html') {
        setCode(DEFAULT_HTML_CODE);
        setLanguage('html');
      }
    }
  }, [open, layerId, layers, layerType]);

  const handleSave = () => {
    if (isCreatingNew) {
      // Create new layer
      const newLayer: Omit<Layer, 'createdAt' | 'updatedAt'> = {
        id: `layer-${Date.now()}`,
        type: language === 'glsl' ? 'shader' : 'html',
        name: `${language === 'glsl' ? 'Shader' : 'HTML'} Layer`,
        opacity: 1,
        blendMode: 'normal',
        transform: {
          position: { x: 0, y: 0 },
          scale: { x: 1, y: 1 },
          rotation: 0,
        },
        visible: true,
        zIndex: 0,
        ...(language === 'glsl' ? { shaderCode: code } : { htmlCode: code }),
      };
      addLayer(newLayer);
    } else if (layerId) {
      // Update existing layer
      const updateData: Partial<Layer> = 
        language === 'glsl' 
          ? { shaderCode: code } 
          : { htmlCode: code };
      updateLayer(layerId, updateData);
    }
    onOpenChange(false);
  };

  const handleCancel = () => {
    setCode('');
    setIsCreatingNew(false);
    onOpenChange(false);
  };

  const getLayerInfo = () => {
    if (layerId && layers[layerId]) {
      return layers[layerId];
    }
    return null;
  };

  const layer = getLayerInfo();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCreatingNew ? (
              <>Create New {language === 'glsl' ? 'Shader' : 'HTML'} Layer</>
            ) : (
              <>
                Edit Layer: {layer?.name || 'Untitled'}
                <Badge variant="secondary" className="ml-2">
                  {layer?.type || language}
                </Badge>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {language === 'glsl' 
              ? 'Write GLSL shader code for visual effects. Changes are hot-reloaded.'
              : 'Write HTML/CSS for overlay content. Changes are hot-reloaded.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 py-2">
          <Select value={language} onValueChange={(val) => setLanguage(val as 'glsl' | 'html')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="glsl">GLSL Shader</SelectItem>
              <SelectItem value="html">HTML/CSS</SelectItem>
            </SelectContent>
          </Select>

          <Select value={editorTheme} onValueChange={setEditorTheme}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vs-dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="hc-black">High Contrast</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 border rounded-md overflow-hidden">
          <Editor
            height="100%"
            language={language === 'glsl' ? 'glsl' : 'html'}
            theme={editorTheme}
            value={code}
            onChange={(value) => setCode(value || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              formatOnPaste: true,
              formatOnType: true,
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {isCreatingNew ? 'Create Layer' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}