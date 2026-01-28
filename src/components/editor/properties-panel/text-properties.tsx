import { Textarea } from "@/components/ui/textarea";
import { FontPicker } from "@/components/ui/font-picker";
import { FontFamily } from "@/constants/font-constants";
import { TextElement } from "@/types/timeline";
import { useTimelineStore } from "@/stores/timeline-store";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { PanelBaseView } from "@/components/editor/panel-base-view";
import {
  TEXT_PROPERTIES_TABS,
  isTextPropertiesTab,
  useTextPropertiesStore,
} from "@/stores/text-properties-store";
import {
  PropertyItem,
  PropertyItemLabel,
  PropertyItemValue,
} from "./property-item";
import { ColorPicker } from "@/components/ui/color-picker";
import { cn, uppercase } from "@/lib/utils";
import { Grid2x2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function TextProperties({
  element,
  trackId,
}: {
  element: TextElement;
  trackId: string;
}) {
  const { updateTextElement } = useTimelineStore();
  const { activeTab, setActiveTab } = useTextPropertiesStore();
  const containerRef = useRef<HTMLDivElement>(null);
  // Local state for input values to allow temporary empty/invalid states
  const [fontSizeInput, setFontSizeInput] = useState(
    element.fontSize.toString()
  );
  const [opacityInput, setOpacityInput] = useState(
    Math.round(element.opacity * 100).toString()
  );
  const [xInput, setXInput] = useState(element.x.toString());
  const [yInput, setYInput] = useState(element.y.toString());
  const [rotationInput, setRotationInput] = useState(element.rotation.toString());

  // Sync local state when element changes (e.g., when switching between elements)
  useEffect(() => {
    setFontSizeInput(element.fontSize.toString());
    setOpacityInput(Math.round(element.opacity * 100).toString());
    setXInput(element.x.toString());
    setYInput(element.y.toString());
    setRotationInput(element.rotation.toString());
  }, [element.id, element.fontSize, element.opacity, element.x, element.y, element.rotation]);

  // Track the last selected color for toggling
  const lastSelectedColor = useRef("#000000");

  const parseAndValidateNumber = (
    value: string,
    min: number,
    max: number,
    fallback: number
  ): number => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
  };

  const handleFontSizeChange = (value: string) => {
    setFontSizeInput(value);

    if (value.trim() !== "") {
      const fontSize = parseAndValidateNumber(value, 8, 300, element.fontSize);
      updateTextElement(trackId, element.id, { fontSize });
    }
  };

  const handleFontSizeBlur = () => {
    const fontSize = parseAndValidateNumber(
      fontSizeInput,
      8,
      300,
      element.fontSize
    );
    setFontSizeInput(fontSize.toString());
    updateTextElement(trackId, element.id, { fontSize });
  };

  const handleOpacityChange = (value: string) => {
    setOpacityInput(value);

    if (value.trim() !== "") {
      const opacityPercent = parseAndValidateNumber(
        value,
        0,
        100,
        Math.round(element.opacity * 100)
      );
      updateTextElement(trackId, element.id, { opacity: opacityPercent / 100 });
    }
  };

  const handleOpacityBlur = () => {
    const opacityPercent = parseAndValidateNumber(
      opacityInput,
      0,
      100,
      Math.round(element.opacity * 100)
    );
    setOpacityInput(opacityPercent.toString());
    updateTextElement(trackId, element.id, { opacity: opacityPercent / 100 });
  };

  const handleXChange = (value: string) => {
    setXInput(value);
    if (value.trim() !== "" && value !== "-") {
      const x = parseAndValidateNumber(value, -1000, 1000, element.x);
      updateTextElement(trackId, element.id, { x });
    }
  };

  const handleXBlur = () => {
    const x = parseAndValidateNumber(xInput, -1000, 1000, element.x);
    setXInput(x.toString());
    updateTextElement(trackId, element.id, { x });
  };

  const handleYChange = (value: string) => {
    setYInput(value);
    if (value.trim() !== "" && value !== "-") {
      const y = parseAndValidateNumber(value, -1000, 1000, element.y);
      updateTextElement(trackId, element.id, { y });
    }
  };

  const handleYBlur = () => {
    const y = parseAndValidateNumber(yInput, -1000, 1000, element.y);
    setYInput(y.toString());
    updateTextElement(trackId, element.id, { y });
  };

  const handleRotationChange = (value: string) => {
    setRotationInput(value);
    if (value.trim() !== "" && value !== "-") {
      const rotation = parseAndValidateNumber(value, -360, 360, element.rotation);
      updateTextElement(trackId, element.id, { rotation });
    }
  };

  const handleRotationBlur = () => {
    const rotation = parseAndValidateNumber(rotationInput, -360, 360, element.rotation);
    setRotationInput(rotation.toString());
    updateTextElement(trackId, element.id, { rotation });
  };

  // Update last selected color when a new color is picked
  const handleColorChange = (color: string) => {
    if (color !== "transparent") {
      lastSelectedColor.current = color;
    }
    updateTextElement(trackId, element.id, { backgroundColor: color });
  };

  // Toggle between transparent and last selected color
  const handleTransparentToggle = (isTransparent: boolean) => {
    const newColor = isTransparent ? "transparent" : lastSelectedColor.current;
    updateTextElement(trackId, element.id, { backgroundColor: newColor });
  };

  return (
    <PanelBaseView
      defaultTab="transform"
      value={activeTab}
      onValueChange={(v) => {
        if (isTextPropertiesTab(v)) setActiveTab(v);
      }}
      ref={containerRef}
      tabs={TEXT_PROPERTIES_TABS.map((t) => ({
        value: t.value,
        label: t.label,
        content:
          t.value === "transform" ? (
            <div className="space-y-6">
              <PropertyItem direction="column">
                <PropertyItemLabel>位置 X</PropertyItemLabel>
                <PropertyItemValue>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[element.x]}
                      min={-500}
                      max={500}
                      step={1}
                      onValueChange={([value]) => {
                        updateTextElement(trackId, element.id, { x: value });
                        setXInput(value.toString());
                      }}
                      className="w-full"
                    />
                    <Input
                      type="number"
                      value={xInput}
                      min={-1000}
                      max={1000}
                      onChange={(e) => handleXChange(e.target.value)}
                      onBlur={handleXBlur}
                      className="w-16 px-2 !text-xs h-7 rounded-sm text-center bg-panel-accent
               [appearance:textfield]
               [&::-webkit-outer-spin-button]:appearance-none
               [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </PropertyItemValue>
              </PropertyItem>
              <PropertyItem direction="column">
                <PropertyItemLabel>位置 Y</PropertyItemLabel>
                <PropertyItemValue>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[element.y]}
                      min={-500}
                      max={500}
                      step={1}
                      onValueChange={([value]) => {
                        updateTextElement(trackId, element.id, { y: value });
                        setYInput(value.toString());
                      }}
                      className="w-full"
                    />
                    <Input
                      type="number"
                      value={yInput}
                      min={-1000}
                      max={1000}
                      onChange={(e) => handleYChange(e.target.value)}
                      onBlur={handleYBlur}
                      className="w-16 px-2 !text-xs h-7 rounded-sm text-center bg-panel-accent
               [appearance:textfield]
               [&::-webkit-outer-spin-button]:appearance-none
               [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </PropertyItemValue>
              </PropertyItem>
              <PropertyItem direction="column">
                <PropertyItemLabel>旋转角度</PropertyItemLabel>
                <PropertyItemValue>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[element.rotation]}
                      min={-180}
                      max={180}
                      step={1}
                      onValueChange={([value]) => {
                        updateTextElement(trackId, element.id, { rotation: value });
                        setRotationInput(value.toString());
                      }}
                      className="w-full"
                    />
                    <Input
                      type="number"
                      value={rotationInput}
                      min={-360}
                      max={360}
                      onChange={(e) => handleRotationChange(e.target.value)}
                      onBlur={handleRotationBlur}
                      className="w-16 px-2 !text-xs h-7 rounded-sm text-center bg-panel-accent
               [appearance:textfield]
               [&::-webkit-outer-spin-button]:appearance-none
               [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </PropertyItemValue>
              </PropertyItem>
            </div>
          ) : (
            <div className="space-y-6">
              <Textarea
                placeholder="名称"
                defaultValue={element.content}
                className="min-h-18 resize-none bg-panel-accent"
                onChange={(e) =>
                  updateTextElement(trackId, element.id, {
                    content: e.target.value,
                  })
                }
              />
              <PropertyItem direction="column">
                <PropertyItemLabel>字体</PropertyItemLabel>
                <PropertyItemValue>
                  <FontPicker
                    defaultValue={element.fontFamily}
                    onValueChange={(value: FontFamily) =>
                      updateTextElement(trackId, element.id, {
                        fontFamily: value,
                      })
                    }
                  />
                </PropertyItemValue>
              </PropertyItem>
              <PropertyItem direction="column">
                <PropertyItemLabel>样式</PropertyItemLabel>
                <PropertyItemValue>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={
                        element.fontWeight === "bold" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        updateTextElement(trackId, element.id, {
                          fontWeight:
                            element.fontWeight === "bold" ? "normal" : "bold",
                        })
                      }
                      className="h-8 px-3 font-bold"
                    >
                      B
                    </Button>
                    <Button
                      variant={
                        element.fontStyle === "italic" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        updateTextElement(trackId, element.id, {
                          fontStyle:
                            element.fontStyle === "italic"
                              ? "normal"
                              : "italic",
                        })
                      }
                      className="h-8 px-3 italic"
                    >
                      I
                    </Button>
                    <Button
                      variant={
                        element.textDecoration === "underline"
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        updateTextElement(trackId, element.id, {
                          textDecoration:
                            element.textDecoration === "underline"
                              ? "none"
                              : "underline",
                        })
                      }
                      className="h-8 px-3 underline"
                    >
                      U
                    </Button>
                    <Button
                      variant={
                        element.textDecoration === "line-through"
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        updateTextElement(trackId, element.id, {
                          textDecoration:
                            element.textDecoration === "line-through"
                              ? "none"
                              : "line-through",
                        })
                      }
                      className="h-8 px-3 line-through"
                    >
                      S
                    </Button>
                  </div>
                </PropertyItemValue>
              </PropertyItem>
              <PropertyItem direction="column">
                <PropertyItemLabel>字号</PropertyItemLabel>
                <PropertyItemValue>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[element.fontSize]}
                      min={8}
                      max={300}
                      step={1}
                      onValueChange={([value]) => {
                        updateTextElement(trackId, element.id, {
                          fontSize: value,
                        });
                        setFontSizeInput(value.toString());
                      }}
                      className="w-full"
                    />
                    <Input
                      type="number"
                      value={fontSizeInput}
                      min={8}
                      max={300}
                      onChange={(e) => handleFontSizeChange(e.target.value)}
                      onBlur={handleFontSizeBlur}
                      className="w-12 px-2 !text-xs h-7 rounded-sm text-center bg-panel-accent
               [appearance:textfield]
               [&::-webkit-outer-spin-button]:appearance-none
               [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </PropertyItemValue>
              </PropertyItem>
              <PropertyItem direction="column">
                <PropertyItemLabel>颜色</PropertyItemLabel>
                <PropertyItemValue>
                  <ColorPicker
                    value={uppercase(
                      (element.color || "FFFFFF").replace("#", "")
                    )}
                    onChange={(color) => {
                      updateTextElement(trackId, element.id, {
                        color: `#${color}`,
                      });
                    }}
                    containerRef={containerRef}
                  />
                </PropertyItemValue>
              </PropertyItem>
              <PropertyItem direction="column">
                <PropertyItemLabel>不透明度</PropertyItemLabel>
                <PropertyItemValue>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[element.opacity * 100]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([value]) => {
                        updateTextElement(trackId, element.id, {
                          opacity: value / 100,
                        });
                        setOpacityInput(value.toString());
                      }}
                      className="w-full"
                    />
                    <Input
                      type="number"
                      value={opacityInput}
                      min={0}
                      max={100}
                      onChange={(e) => handleOpacityChange(e.target.value)}
                      onBlur={handleOpacityBlur}
                      className="w-12 !text-xs h-7 rounded-sm text-center bg-panel-accent
               [appearance:textfield]
               [&::-webkit-outer-spin-button]:appearance-none
               [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </PropertyItemValue>
              </PropertyItem>
              <PropertyItem direction="column">
                <PropertyItemLabel>背景</PropertyItemLabel>
                <PropertyItemValue>
                  <div className="flex items-center gap-2">
                    <ColorPicker
                      value={uppercase(
                        element.backgroundColor === "transparent"
                          ? lastSelectedColor.current.replace("#", "")
                          : (element.backgroundColor || "#000000").replace(
                              "#",
                              ""
                            )
                      )}
                      onChange={(color) => handleColorChange(`#${color}`)}
                      containerRef={containerRef}
                      className={
                        element.backgroundColor === "transparent"
                          ? "opacity-50 pointer-events-none"
                          : ""
                      }
                    />

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            handleTransparentToggle(
                              element.backgroundColor !== "transparent"
                            )
                          }
                          className="size-9 rounded-full bg-panel-accent p-0 overflow-hidden"
                        >
                          <Grid2x2
                            className={cn(
                              "text-foreground",
                              element.backgroundColor === "transparent" &&
                                "text-primary"
                            )}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>透明背景</TooltipContent>
                    </Tooltip>
                  </div>
                </PropertyItemValue>
              </PropertyItem>
            </div>
          ),
      }))}
    />
  );
}
