#!/usr/bin/env python3
# qr_direct_edges.py
"""
Генератор простых рёбер: от QR-узлов -> к целевым объектам (прямые линии, через стены).
Input: nodes.csv с колонками id,name,floor,x,y,type
Output:
  - edges.csv (from,to,type,accessible)  -- по умолчанию type='direct'
  - optional: edges_weights.csv (from,to,length,weight,type)

Usage examples:
  python qr_direct_edges.py --nodes nodes.csv --out edges.csv
  python qr_direct_edges.py --nodes nodes.csv --out edges.csv --target-types classroom,toilet,stair --weights
  python qr_direct_edges.py --nodes nodes.csv --out edges.csv --directed false
"""
import csv, math, argparse, os, sys

def read_nodes(path):
    with open(path, newline='', encoding='utf-8-sig') as f:
        r = csv.DictReader(f)
        # normalize headers
        headers = [h.lower() for h in r.fieldnames]
        required = {'id','x','y','floor'}
        if not required.issubset(set(headers)):
            raise SystemExit(f"ERROR: nodes.csv must contain headers id,x,y,floor (found: {r.fieldnames})")
        nodes = []
        for row in r:
            # case-insensitive access
            def g(k):
                for kk in row:
                    if kk.lower()==k:
                        return row[kk]
                return ''
            nid = (g('id') or '').strip()
            try:
                x = float((g('x') or '0').strip())
                y = float((g('y') or '0').strip())
            except:
                raise SystemExit(f"ERROR parsing coordinates for node {nid}: x/y must be numbers")
            floor = (g('floor') or '').strip()
            ntype = (g('type') or '').strip().lower()
            name = (g('name') or nid).strip()
            nodes.append({'id':nid, 'name':name, 'x':x, 'y':y, 'floor':floor, 'type':ntype})
        return nodes

def is_qr_node(n):
    # consider type == 'qr_node' OR id/name containing 'qr' (case-insensitive)
    if (n['type'] or '').lower() == 'qr_node':
        return True
    lid = n['id'].lower()
    if 'qr' in lid and re_match_qr(lid):
        return True
    return False

def re_match_qr(s):
    # crude safe check: look for 'qr' as separate token or _qr or qr\d
    return ('_qr' in s) or s.startswith('qr') or ('qr' in s and any(ch.isdigit() for ch in s.split('qr')[-1]))

def euclid(a,b):
    return math.hypot(a['x']-b['x'], a['y']-b['y'])

def write_edges(edges, path):
    with open(path, 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f)
        w.writerow(['from','to','type','accessible'])
        for e in edges:
            w.writerow(e)

def write_edges_weights(weights, path):
    with open(path, 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f)
        w.writerow(['from','to','length','weight','type'])
        for e in weights:
            w.writerow(e)

import re
def main(argv):
    p = argparse.ArgumentParser(description="Generate direct edges from QR nodes to targets.")
    p.add_argument('--nodes','-n', required=True, help='path to nodes.csv')
    p.add_argument('--out','-o', default='edges.csv', help='output edges CSV')
    p.add_argument('--target-types','-t', default='', help='comma-separated target node types (default: all non-QR types)')
    p.add_argument('--directed', type=str, default='true', help='true/false — if false, generate both directions')
    p.add_argument('--weights', action='store_true', help='also output edges_weights.csv with length and weight')
    p.add_argument('--max-dist', type=float, default=None, help='optional: max distance to create edge')
    args = p.parse_args(argv)

    nodes = read_nodes(args.nodes)
    if not nodes:
        raise SystemExit("No nodes read from file.")

    # normalize target types
    target_types = set([t.strip().lower() for t in args.target_types.split(',') if t.strip()]) if args.target_types else None
    directed = (args.directed.lower() == 'true')

    # identify qr nodes
    qr_nodes = []
    other_nodes = []
    for n in nodes:
        lid = n['id'].lower()
        # QR if explicit type or contains token '_qr' or startswith qr
        qr_flag = False
        if n['type']=='qr_node' or '_qr' in lid or lid.startswith('qr'):
            qr_flag = True
        if qr_flag:
            qr_nodes.append(n)
        else:
            other_nodes.append(n)

    # If no qr nodes found by heuristics, try another detection: nodes with "qr" anywhere
    if not qr_nodes:
        for n in nodes:
            if 'qr' in n['id'].lower() or 'qr' in n['name'].lower():
                qr_nodes.append(n)
        # remaining
        other_nodes = [n for n in nodes if n not in qr_nodes]

    if not qr_nodes:
        print("[WARN] No QR nodes detected. Nothing to connect. Check 'type' column or id naming (should contain 'QR').")
        # still allow connecting all nodes? abort.
        sys.exit(0)

    # Build map by floor
    by_floor = {}
    for n in nodes:
        by_floor.setdefault(n['floor'], []).append(n)

    edges = []
    weights = []
    for qr in qr_nodes:
        floor_list = by_floor.get(qr['floor'], [])
        for cand in floor_list:
            if cand['id'] == qr['id']:
                continue
            # if target_types specified, skip others
            if target_types and cand['type'] not in target_types:
                continue
            # skip other QR nodes
            if cand['type']=='qr_node' or ('_qr' in cand['id'].lower()) or cand['id'].lower().startswith('qr'):
                continue
            # optional distance cutoff
            d = euclid(qr, cand)
            if args.max_dist is not None and d > args.max_dist:
                continue
            # add directed edge qr->cand
            edges.append( (qr['id'], cand['id'], 'direct', 1) )
            if args.weights:
                weights.append( (qr['id'], cand['id'], round(d,2), round(d,2), 'direct') )
            # if not directed, add reverse as well
            if not directed:
                edges.append( (cand['id'], qr['id'], 'direct', 1) )
                if args.weights:
                    weights.append( (cand['id'], qr['id'], round(d,2), round(d,2), 'direct') )

    # deduplicate while preserving order
    seen = set(); uniq_edges = []
    for e in edges:
        key = (e[0],e[1])
        if key in seen: continue
        seen.add(key); uniq_edges.append(e)

    write_edges(uniq_edges, args.out)
    print(f"[OK] wrote {len(uniq_edges)} edges to {args.out}")

    if args.weights:
        wpath = os.path.splitext(args.out)[0] + "_weights.csv"
        # dedup weights similarly
        seen_w = set(); uniq_w = []
        for w in weights:
            k=(w[0],w[1])
            if k in seen_w: continue
            seen_w.add(k); uniq_w.append(w)
        write_edges_weights(uniq_w, wpath)
        print(f"[OK] wrote {len(uniq_w)} weighted edges to {wpath}")

if __name__ == '__main__':
    main(sys.argv[1:])