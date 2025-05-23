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

      // Track symbol co-occurrences
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
        const angle = (index / filteredSymbols.length) * 2 * Math.PI;
        const distance = Math.random() * radius + 50;

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

        return {
          id: symbol,
          name: symbol,
          count: data.count,
          emotions: data.emotions,
          size: Math.max(20, Math.min(50, data.count * 5)),
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance,
          vx: 0,
          vy: 0,
          color:
            emotionColors[dominantEmotion as keyof typeof emotionColors] ||
            "#6366F1",
        };
      },
    );

    // Create connections between frequently co-occurring symbols
    const symbolConnections: SymbolConnection[] = [];
    filteredSymbols.forEach(([symbol1]) => {
      filteredSymbols.forEach(([symbol2]) => {
        if (
          symbol1 !== symbol2 &&
          symbolCoOccurrence[symbol1]?.[symbol2] >= 2
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
            const force = Math.min(1000 / (distance * distance), 10);
            fx += (dx / distance) * force;
            fy += (dy / distance) * force;
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
              const optimalDistance = 80;
              const force =
                ((distance - optimalDistance) * 0.1 * conn.strength) / 5;
              fx += (dx / distance) * force;
              fy += (dy / distance) * force;
            }
          }
        });

        // Center attraction
        const centerX = 200,
          centerY = 150;
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        fx += dx * 0.02;
        fy += dy * 0.02;

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
            <p className="text-lg font-medium mb-2">Not enough data yet</p>
            <p className="text-sm">
              Record more dreams with analyses to see how your symbols connect!
            </p>
            <p className="text-xs mt-2 text-gray-500">
              Minimum {filterThreshold} symbol occurrences needed
            </p>
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
                whileHover={{ scale: 1.2 }}
                onClick={() =>
                  setSelectedNode(selectedNode?.id === node.id ? null : node)
                }
              >
                <div
                  className="w-full h-full rounded-full border-2 border-white/20 flex items-center justify-center text-white font-medium shadow-lg"
                  style={{ backgroundColor: node.color }}
                >
                  <span className="text-xs text-center leading-tight px-1">
                    {node.name.length > 8
                      ? node.name.slice(0, 8) + "..."
                      : node.name}
                  </span>
                </div>

                {/* Connection count badge */}
                <div className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
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
