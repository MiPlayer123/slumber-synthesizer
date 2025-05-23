import { motion } from "framer-motion";
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, Filter, Zap } from "lucide-react";
import type { DreamAnalysis } from "@/lib/types";

interface SymbolNode {
  id: string;
  name: string;
  count: number;
  emotions: Record<string, number>;
  size: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
}

interface SymbolConnection {
  source: string;
  target: string;
  strength: number;
  sharedDreams: number;
}

interface SymbolNetworkGraphProps {
  analyses: DreamAnalysis[];
  className?: string;
}

export const SymbolNetworkGraph = ({
  analyses,
  className,
}: SymbolNetworkGraphProps) => {
  const [selectedNode, setSelectedNode] = useState<SymbolNode | null>(null);
  const [filterThreshold, setFilterThreshold] = useState(2);
  const [isAnimating, setIsAnimating] = useState(true);

  // Process data to create nodes and connections
  const { nodes, connections } = useMemo(() => {
    if (!analyses.length) return { nodes: [], connections: [] };

    // Map to track symbol co-occurrences
    const symbolCoOccurrence: Record<string, Record<string, number>> = {};
    const symbolData: Record<
      string,
      { count: number; emotions: Record<string, number> }
    > = {};

    analyses.forEach((analysis) => {
      const symbols = analysis.symbols || [];
      const emotions = analysis.emotions || [];

      // Track individual symbols and their emotions
      symbols.forEach((symbol) => {
        if (!symbolData[symbol]) {
          symbolData[symbol] = { count: 0, emotions: {} };
        }
        symbolData[symbol].count++;

        emotions.forEach((emotion) => {
          symbolData[symbol].emotions[emotion] =
            (symbolData[symbol].emotions[emotion] || 0) + 1;
        });
      });

      // Track symbol co-occurrences (only if there are multiple symbols)
      if (symbols.length > 1) {
        for (let i = 0; i < symbols.length; i++) {
          for (let j = i + 1; j < symbols.length; j++) {
            const symbol1 = symbols[i];
            const symbol2 = symbols[j];

            if (!symbolCoOccurrence[symbol1]) symbolCoOccurrence[symbol1] = {};
            if (!symbolCoOccurrence[symbol2]) symbolCoOccurrence[symbol2] = {};

            symbolCoOccurrence[symbol1][symbol2] =
              (symbolCoOccurrence[symbol1][symbol2] || 0) + 1;
            symbolCoOccurrence[symbol2][symbol1] =
              (symbolCoOccurrence[symbol2][symbol1] || 0) + 1;
          }
        }
      }
    });

    // Filter symbols by minimum count threshold
    const filteredSymbols = Object.entries(symbolData)
      .filter(([, data]) => data.count >= filterThreshold)
      .slice(0, 20); // Limit to top 20 for performance

    if (!filteredSymbols.length) return { nodes: [], connections: [] };

    // Create nodes with force-directed positioning
    const centerX = 200;
    const centerY = 150;
    const radius = 120;

    const symbolNodes: SymbolNode[] = filteredSymbols.map(
      ([symbol, data], index) => {
        // Better spacing algorithm - more spread out positioning
        const nodeCount = filteredSymbols.length;
        let x, y;

        if (nodeCount <= 6) {
          // For small numbers, use a larger circle
          const angle = (index / nodeCount) * 2 * Math.PI;
          const distance = radius + 40; // Increase base distance
          x = centerX + Math.cos(angle) * distance;
          y = centerY + Math.sin(angle) * distance;
        } else if (nodeCount <= 12) {
          // For medium numbers, use a larger circle with some randomness
          const angle = (index / nodeCount) * 2 * Math.PI;
          const distance = radius + 20 + Math.random() * 60; // More spread with randomness
          x = centerX + Math.cos(angle) * distance;
          y = centerY + Math.sin(angle) * distance;
        } else {
          // For larger numbers, use a more spread out spiral
          const spiral = index * 0.8; // Increased spiral factor
          const angle = spiral * Math.PI;
          const distance = 60 + spiral * 12; // Increased base distance and growth
          x = centerX + Math.cos(angle) * distance;
          y = centerY + Math.sin(angle) * distance;
        }

        // Get dominant emotion for coloring
        const dominantEmotion =
          Object.entries(data.emotions).sort(([, a], [, b]) => b - a)[0]?.[0] ||
          "neutral";

        const emotionColors = {
          joy: "#FCD34D",
          peace: "#10B981",
          excitement: "#F97316",
          neutral: "#6366F1",
          confusion: "#8B5CF6",
          anxiety: "#EF4444",
          fear: "#DC2626",
          sadness: "#3B82F6",
        };

        // Keep the improved node sizing
        const nodeSize = Math.max(35, Math.min(65, data.count * 8 + 25));

        return {
          id: symbol,
          name: symbol,
          count: data.count,
          emotions: data.emotions,
          size: nodeSize,
          x,
          y,
          vx: 0,
          vy: 0,
          color:
            emotionColors[dominantEmotion as keyof typeof emotionColors] ||
            "#6366F1",
        };
      },
    );

    // Create connections between co-occurring symbols (lowered threshold)
    const symbolConnections: SymbolConnection[] = [];
    const connectionThreshold = Math.max(1, Math.floor(filterThreshold / 2)); // Lower threshold for connections

    filteredSymbols.forEach(([symbol1]) => {
      filteredSymbols.forEach(([symbol2]) => {
        if (
          symbol1 !== symbol2 &&
          symbolCoOccurrence[symbol1]?.[symbol2] >= connectionThreshold
        ) {
          const existing = symbolConnections.find(
            (conn) =>
              (conn.source === symbol1 && conn.target === symbol2) ||
              (conn.source === symbol2 && conn.target === symbol1),
          );

          if (!existing) {
            symbolConnections.push({
              source: symbol1,
              target: symbol2,
              strength: symbolCoOccurrence[symbol1][symbol2],
              sharedDreams: symbolCoOccurrence[symbol1][symbol2],
            });
          }
        }
      });
    });

    return { nodes: symbolNodes, connections: symbolConnections };
  }, [analyses, filterThreshold]);

  // Simple physics simulation for node positioning
  useEffect(() => {
    if (!isAnimating || !nodes.length) return;

    const interval = setInterval(() => {
      nodes.forEach((node, i) => {
        let fx = 0,
          fy = 0;

        // Repulsion from other nodes
        nodes.forEach((other, j) => {
          if (i !== j) {
            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const minDistance = (node.size + other.size) / 2 + 25; // Slightly increased minimum distance

            if (distance < minDistance) {
              const force = Math.min(1500 / (distance * distance), 12); // Reduced force
              fx += (dx / distance) * force;
              fy += (dy / distance) * force;
            }
          }
        });

        // Attraction from connections
        connections.forEach((conn) => {
          if (conn.source === node.id) {
            const target = nodes.find((n) => n.id === conn.target);
            if (target) {
              const dx = target.x - node.x;
              const dy = target.y - node.y;
              const distance = Math.sqrt(dx * dx + dy * dy) || 1;
              const optimalDistance = 100; // Increased optimal distance
              const force =
                ((distance - optimalDistance) * 0.08 * conn.strength) / 5; // Reduced attraction force
              fx += (dx / distance) * force;
              fy += (dy / distance) * force;
            }
          }
        });

        // Center attraction (reduced)
        const centerX = 200,
          centerY = 150;
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        fx += dx * 0.01; // Reduced center attraction
        fy += dy * 0.01;

        // Apply forces with damping
        node.vx = (node.vx + fx) * 0.9;
        node.vy = (node.vy + fy) * 0.9;
        node.x += node.vx;
        node.y += node.vy;

        // Boundary constraints
        node.x = Math.max(node.size / 2, Math.min(400 - node.size / 2, node.x));
        node.y = Math.max(node.size / 2, Math.min(300 - node.size / 2, node.y));
      });
    }, 50);

    const timeout = setTimeout(() => {
      setIsAnimating(false);
      clearInterval(interval);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [nodes, connections, isAnimating]);

  if (!nodes.length) {
    // Calculate available symbols at different thresholds for better feedback
    const symbolsAtThreshold1 = Object.entries(
      analyses.reduce(
        (acc, analysis) => {
          (analysis.symbols || []).forEach((symbol) => {
            acc[symbol] = (acc[symbol] || 0) + 1;
          });
          return acc;
        },
        {} as Record<string, number>,
      ),
    ).filter(([, count]) => count >= 1).length;

    const symbolsAtThreshold2 = Object.entries(
      analyses.reduce(
        (acc, analysis) => {
          (analysis.symbols || []).forEach((symbol) => {
            acc[symbol] = (acc[symbol] || 0) + 1;
          });
          return acc;
        },
        {} as Record<string, number>,
      ),
    ).filter(([, count]) => count >= 2).length;

    return (
      <Card
        className={`bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-purple-500/20 ${className}`}
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Network className="w-5 h-5 text-purple-400" />
            Symbol Network
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-400">
            <Network className="w-16 h-16 mx-auto mb-4 opacity-50" />

            {analyses.length === 0 ? (
              <>
                <p className="text-lg font-medium mb-2">
                  No dream analyses found
                </p>
                <p className="text-sm">
                  Record and analyze some dreams to see how your symbols
                  connect!
                </p>
              </>
            ) : symbolsAtThreshold1 === 0 ? (
              <>
                <p className="text-lg font-medium mb-2">No symbols detected</p>
                <p className="text-sm">
                  Your dream analyses don't contain symbol data yet.
                </p>
                <p className="text-xs mt-2 text-gray-500">
                  Found {analyses.length} analyses but no symbols were
                  extracted.
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium mb-2">
                  Filter threshold too high
                </p>
                <p className="text-sm mb-3">
                  No symbols appear {filterThreshold}+ times in your dreams.
                </p>
                <div className="text-sm text-gray-300 mb-4">
                  <p>Available symbols:</p>
                  <p>• {symbolsAtThreshold1} symbols appear 1+ times</p>
                  <p>• {symbolsAtThreshold2} symbols appear 2+ times</p>
                </div>
                <button
                  onClick={() => setFilterThreshold(1)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                >
                  Show all symbols (1+)
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-purple-500/20 ${className}`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Network className="w-5 h-5 text-purple-400" />
          Symbol Network
          <Badge variant="secondary" className="ml-auto">
            {nodes.length} symbols, {connections.length} connections
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <label className="text-sm text-gray-300">Min occurrences:</label>
              <select
                value={filterThreshold}
                onChange={(e) => setFilterThreshold(Number(e.target.value))}
                className="bg-gray-800 text-white text-sm px-2 py-1 rounded border border-gray-600"
              >
                <option value={1}>1+</option>
                <option value={2}>2+</option>
                <option value={3}>3+</option>
                <option value={5}>5+</option>
              </select>
            </div>

            <button
              onClick={() => setIsAnimating(true)}
              className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
            >
              <Zap className="w-4 h-4" />
              Restart Animation
            </button>
          </div>

          {/* Network Visualization */}
          <div className="relative bg-gray-900/50 rounded-lg p-4 h-80 overflow-hidden">
            {connections.length === 0 && nodes.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="bg-gray-800/90 rounded-lg p-4 text-center max-w-xs">
                  <p className="text-sm text-yellow-400 mb-2">
                    <strong>Symbols found, but no connections yet!</strong>
                  </p>
                  <p className="text-xs text-gray-300">
                    Try lowering the minimum occurrences filter, or record more
                    dreams with multiple symbols to see connections.
                  </p>
                </div>
              </div>
            )}

            <svg width="100%" height="100%" className="absolute inset-0">
              {/* Connections */}
              {connections.map((conn, index) => {
                const sourceNode = nodes.find((n) => n.id === conn.source);
                const targetNode = nodes.find((n) => n.id === conn.target);

                if (!sourceNode || !targetNode) return null;

                return (
                  <motion.line
                    key={`${conn.source}-${conn.target}`}
                    x1={sourceNode.x}
                    y1={sourceNode.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke="#6366F1"
                    strokeWidth={Math.max(1, conn.strength)}
                    strokeOpacity={0.4}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: index * 0.1 }}
                  />
                );
              })}
            </svg>

            {/* Nodes */}
            {nodes.map((node, index) => (
              <motion.div
                key={node.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                style={{
                  left: node.x,
                  top: node.y,
                  width: node.size,
                  height: node.size,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.05, type: "spring" }}
                whileHover={{ scale: 1.1, zIndex: 50 }}
                onClick={() =>
                  setSelectedNode(selectedNode?.id === node.id ? null : node)
                }
              >
                <div
                  className="w-full h-full rounded-full border-2 border-white/30 flex items-center justify-center text-white font-medium shadow-lg relative"
                  style={{ backgroundColor: node.color }}
                >
                  {/* Text with better contrast and sizing */}
                  <span
                    className="text-center leading-tight font-semibold drop-shadow-lg"
                    style={{
                      fontSize: node.size > 50 ? "10px" : "9px",
                      textShadow:
                        "1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8)",
                      padding: "2px",
                      wordBreak: "break-word",
                      maxWidth: `${node.size - 8}px`,
                      lineHeight: "1.1",
                    }}
                  >
                    {node.name.length > 10
                      ? node.name.slice(0, 8) + "..."
                      : node.name}
                  </span>
                </div>

                {/* Connection count badge - positioned better */}
                <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center border-2 border-white/30 font-bold">
                  {node.count}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Selected Node Details */}
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-gray-800/50 rounded-lg border border-gray-600/30"
            >
              <h3 className="text-lg font-medium text-white mb-2">
                "{selectedNode.name}" Analysis
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-300 mb-1">
                    <strong>Occurrences:</strong> {selectedNode.count} dreams
                  </p>
                  <p className="text-sm text-gray-300">
                    <strong>Connections:</strong>{" "}
                    {
                      connections.filter(
                        (c) =>
                          c.source === selectedNode.id ||
                          c.target === selectedNode.id,
                      ).length
                    }{" "}
                    symbols
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-300 mb-1">
                    <strong>Associated Emotions:</strong>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(selectedNode.emotions)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 3)
                      .map(([emotion, count]) => (
                        <Badge
                          key={emotion}
                          variant="outline"
                          className="text-xs"
                        >
                          {emotion} ({count})
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Legend */}
          <div className="text-xs text-gray-400 space-y-1">
            <p>
              • <strong>Node size:</strong> frequency of symbol appearance
            </p>
            <p>
              • <strong>Line thickness:</strong> how often symbols appear
              together
            </p>
            <p>
              • <strong>Colors:</strong> dominant emotion associated with each
              symbol
            </p>
            <p>• Click nodes to see detailed analysis</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
