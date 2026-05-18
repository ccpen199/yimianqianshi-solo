import React, { useState, useEffect, useCallback } from 'react'
import { Typography, Button, Space, Card, Checkbox, Radio, message, Spin, Tag, Alert, Row, Col } from 'antd'
import { LeftOutlined, RightOutlined, SaveOutlined, CheckOutlined, WarningOutlined } from '@ant-design/icons'
import request from '../utils/request'

const { Title, Text } = Typography

function Annotation({ user }) {
  const [currentSample, setCurrentSample] = useState(null)
  const [selectedTags, setSelectedTags] = useState([])
  const [versions, setVersions] = useState([])
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasConflict, setHasConflict] = useState(false)
  const [conflictAnnotations, setConflictAnnotations] = useState([])

  useEffect(() => {
    loadVersions()
  }, [])

  useEffect(() => {
    if (selectedVersion) {
      loadTags(selectedVersion.id)
    }
  }, [selectedVersion])

  useEffect(() => {
    if (currentSample) {
      loadAnnotation(currentSample.id)
      loadConflicts(currentSample.id)
    }
  }, [currentSample])

  const loadVersions = async () => {
    try {
      const res = await request({ url: '/tags/versions', params: { status: 'published' } })
      if (res.success && res.data && res.data.length > 0) {
        setVersions(res.data)
        setSelectedVersion(res.data[0])
      }
    } catch (error) {
      console.error('Failed to load versions:', error)
    }
  }

  const loadTags = async (versionId) => {
    try {
      const res = await request({ url: `/tags/versions/${versionId}/tags` })
      if (res.success) {
        setTags(res.data || [])
      }
    } catch (error) {
      console.error('Failed to load tags:', error)
    }
  }

  const loadAnnotation = async (sampleId) => {
    try {
      const res = await request({ 
        url: `/annotations/${sampleId}`,
        params: { annotator_id: user?.id }
      })
      if (res.success && res.data) {
        setSelectedTags(res.data.tags || [])
      } else {
        setSelectedTags([])
      }
    } catch (error) {
      setSelectedTags([])
    }
  }

  const loadConflicts = async (sampleId) => {
    try {
      const res = await request({ url: `/annotations/conflicts/${sampleId}` })
      if (res.success) {
        setHasConflict(res.data.has_conflict || false)
        setConflictAnnotations(res.data.annotations || [])
      }
    } catch (error) {
      console.error('Failed to load conflicts:', error)
    }
  }

  const loadNextSample = async () => {
    setLoading(true)
    try {
      const res = await request({ 
        url: '/texts/samples/next',
        params: { current_id: currentSample?.id || 0, status: 'pending' }
      })
      if (res.success) {
        if (res.data) {
          setCurrentSample(res.data)
        } else {
          message.info('暂无更多待标注样本')
        }
      }
    } catch (error) {
      console.error('Failed to load next sample:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPrevSample = async () => {
    setLoading(true)
    try {
      const res = await request({ 
        url: '/texts/samples/prev',
        params: { current_id: currentSample?.id || 999999, status: 'pending' }
      })
      if (res.success && res.data) {
        setCurrentSample(res.data)
      }
    } catch (error) {
      console.error('Failed to load prev sample:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!currentSample && versions.length > 0) {
      loadNextSample()
    }
  }, [versions])

  const saveDraft = async () => {
    try {
      await request({
        url: '/annotations',
        method: 'POST',
        data: {
          sample_id: currentSample.id,
          version_id: selectedVersion.id,
          annotator_id: user.id,
          tags: selectedTags,
          is_draft: 1
        }
      })
      message.success('草稿保存成功')
    } catch (error) {
      message.error('保存草稿失败')
    }
  }

  const submitAnnotation = async () => {
    if (selectedTags.length === 0) {
      message.warning('请至少选择一个标签')
      return
    }

    try {
      await request({
        url: '/annotations',
        method: 'POST',
        data: {
          sample_id: currentSample.id,
          version_id: selectedVersion.id,
          annotator_id: user.id,
          tags: selectedTags,
          is_draft: 0
        }
      })
      message.success('标注提交成功')
      loadNextSample()
    } catch (error) {
      message.error('提交失败')
    }
  }

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowLeft') {
      loadPrevSample()
    } else if (e.key === 'ArrowRight') {
      loadNextSample()
    } else if (e.key === 's' && e.ctrlKey) {
      e.preventDefault()
      saveDraft()
    } else if (e.key === 'Enter') {
      submitAnnotation()
    }
  }, [currentSample, selectedTags])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleTagChange = (tagName, checked) => {
    if (checked) {
      setSelectedTags([...selectedTags, tagName])
    } else {
      setSelectedTags(selectedTags.filter(t => t !== tagName))
    }
  }

  const renderTags = (tagList, level = 0) => {
    return tagList?.map(tag => (
      <div key={tag.id} style={{ marginLeft: level * 24, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Checkbox
            checked={selectedTags.includes(tag.name)}
            onChange={(e) => handleTagChange(tag.name, e.target.checked)}
          />
          <Tag color={tag.color}>{tag.name}</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>{tag.description || ''}</Text>
        </div>
        {tag.children && tag.children.length > 0 && renderTags(tag.children, level + 1)}
      </div>
    ))
  }

  if (!selectedVersion) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin tip="加载中..." />
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3}>文本标注</Title>
        <Space>
          <Tag color="blue">当前版本: {selectedVersion.version}</Tag>
          <Text type="secondary">快捷键: ←上一条 →下一条 Ctrl+S保存 Enter提交</Text>
        </Space>
      </div>

      {hasConflict && (
        <Alert
          message="标注冲突提示"
          description={
            <div>
              <p>当前文本已有其他标注员标注，标注结果存在差异：</p>
              {conflictAnnotations.map((anno, idx) => (
                <div key={idx}>
                  <Text strong>{anno.username}:</Text> {anno.tags?.join(', ')}
                </div>
              ))}
            </div>
          }
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={24}>
        <Col span={16}>
          <Card
            title={`样本 #${currentSample?.id || '-'}`}
            extra={
              <Space>
                <Button icon={<LeftOutlined />} onClick={loadPrevSample} disabled={loading}>
                  上一条
                </Button>
                <Button icon={<RightOutlined />} onClick={loadNextSample} disabled={loading}>
                  下一条
                </Button>
              </Space>
            }
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin tip="加载中..." />
              </div>
            ) : currentSample ? (
              <div style={{ minHeight: 200, fontSize: 16, lineHeight: 1.8 }}>
                {currentSample.content}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                暂无待标注样本
              </div>
            )}
          </Card>

          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Space>
              <Button icon={<SaveOutlined />} onClick={saveDraft}>
                保存草稿
              </Button>
              <Button type="primary" icon={<CheckOutlined />} onClick={submitAnnotation}>
                提交标注
              </Button>
            </Space>
          </div>
        </Col>

        <Col span={8}>
          <Card title="标签选择">
            {renderTags(tags)}
          </Card>
          
          <Card title="已选标签" style={{ marginTop: 16 }}>
            {selectedTags.length > 0 ? (
              <Space wrap>
                {selectedTags.map((tag, idx) => (
                  <Tag key={idx} color="blue">{tag}</Tag>
                ))}
              </Space>
            ) : (
              <Text type="secondary">暂未选择标签</Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Annotation
