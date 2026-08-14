const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
// HTMLやJSなどの静的ファイルを配信
app.use(express.static(__dirname));

// ExcelデータをJSONとして返すAPI
app.get('/api/data', (req, res) => {
  try {
    const filePath = path.join(__dirname, 'touken_mst.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Excelの1行目をキーとしてJSON配列に変換
    const jsonData = XLSX.utils.sheet_to_json(sheet);
    res.json(jsonData);
  } catch (error) {
    console.error('Excel読み込みエラー:', error);
    res.status(500).json({ error: 'Excelファイルの読み込みに失敗しました。' });
  }
});

app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});